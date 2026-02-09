"""CLI for user management and import debugging.

Usage:
    python -m app.cli create-user --username admin --email admin@example.com --password secret --admin
    python -m app.cli list-users
    python -m app.cli set-admin --username admin --admin
    python -m app.cli set-admin --username admin --no-admin
    python -m app.cli set-active --username admin --inactive
    python -m app.cli reset-password --username admin --password newpass
    python -m app.cli retry-categorize --job-id <uuid>
    python -m app.cli import-errors [--job-id <uuid>]
    python -m app.cli force-complete --job-id <uuid>
"""

from __future__ import annotations

import argparse
import sys
import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from app.database import sync_session_factory
from app.models import *  # noqa: F401, F403 — ensure all models are loaded
from app.models.import_job import ImportJob, ImportStatus
from app.models.user import User
from app.services.auth_service import hash_password


def create_user(args: argparse.Namespace) -> None:
    with sync_session_factory() as db:
        existing = db.execute(
            select(User).where((User.username == args.username) | (User.email == args.email))
        ).scalar_one_or_none()
        if existing is not None:
            print(f"Error: username '{args.username}' or email '{args.email}' already exists")
            sys.exit(1)

        user = User(
            username=args.username,
            email=args.email,
            hashed_password=hash_password(args.password),
            is_admin=args.admin,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user: {user.username} (id={user.id}, admin={user.is_admin})")


def list_users(_args: argparse.Namespace) -> None:
    with sync_session_factory() as db:
        result = db.execute(select(User).order_by(User.created_at))
        users = result.scalars().all()

        if not users:
            print("No users found.")
            return

        # Table header
        print(f"{'ID':<38} {'Username':<20} {'Email':<30} {'Active':<8} {'Admin':<8}")
        print("-" * 104)
        for u in users:
            print(
                f"{str(u.id):<38} {u.username:<20} {u.email:<30} "
                f"{'yes' if u.is_active else 'no':<8} {'yes' if u.is_admin else 'no':<8}"
            )
        print(f"\nTotal: {len(users)} user(s)")


def set_admin(args: argparse.Namespace) -> None:
    with sync_session_factory() as db:
        result = db.execute(select(User).where(User.username == args.username))
        user = result.scalar_one_or_none()
        if user is None:
            print(f"Error: user '{args.username}' not found")
            sys.exit(1)

        user.is_admin = args.admin
        db.commit()
        print(f"User '{user.username}' admin={'yes' if user.is_admin else 'no'}")


def set_active(args: argparse.Namespace) -> None:
    with sync_session_factory() as db:
        result = db.execute(select(User).where(User.username == args.username))
        user = result.scalar_one_or_none()
        if user is None:
            print(f"Error: user '{args.username}' not found")
            sys.exit(1)

        user.is_active = not args.inactive
        db.commit()
        print(f"User '{user.username}' active={'yes' if user.is_active else 'no'}")


def reset_password(args: argparse.Namespace) -> None:
    with sync_session_factory() as db:
        result = db.execute(select(User).where(User.username == args.username))
        user = result.scalar_one_or_none()
        if user is None:
            print(f"Error: user '{args.username}' not found")
            sys.exit(1)

        user.hashed_password = hash_password(args.password)
        db.commit()
        print(f"Password reset for user '{user.username}'")


def retry_categorize(args: argparse.Namespace) -> None:
    from app.tasks.import_tasks import categorize_import_task

    with sync_session_factory() as db:
        job = db.execute(
            select(ImportJob).where(ImportJob.id == uuid.UUID(args.job_id))
        ).scalar_one_or_none()
        if job is None:
            print(f"Error: import job '{args.job_id}' not found")
            sys.exit(1)
        if job.status not in (ImportStatus.COMPLETED, ImportStatus.PARTIALLY_FAILED):
            print(
                f"Error: job status is '{job.status.value}', "
                f"must be 'completed' or 'partially_failed'"
            )
            sys.exit(1)

        result = categorize_import_task.apply_async(
            ({"job_id": str(job.id), "status": job.status.value},)
        )
        print(f"Dispatched categorize task {result.id} for job {job.id}")


def import_errors(args: argparse.Namespace) -> None:
    with sync_session_factory() as db:
        if args.job_id:
            job = db.execute(
                select(ImportJob).where(ImportJob.id == uuid.UUID(args.job_id))
            ).scalar_one_or_none()
            if job is None:
                print(f"Error: import job '{args.job_id}' not found")
                sys.exit(1)
            print(f"Job:      {job.id}")
            print(f"File:     {job.filename}")
            print(f"Status:   {job.status.value}")
            print(f"Error:    {job.error_message or '(none)'}")
            return

        jobs = (
            db.execute(
                select(ImportJob)
                .where(ImportJob.error_message.is_not(None))
                .order_by(ImportJob.created_at.desc())
                .limit(20)
            )
            .scalars()
            .all()
        )
        if not jobs:
            print("No import jobs with errors found.")
            return

        print(f"{'ID':<38} {'Filename':<30} {'Status':<18} {'Error'}")
        print("-" * 120)
        for j in jobs:
            err = (j.error_message or "")[:100]
            print(f"{str(j.id):<38} {j.filename:<30} {j.status.value:<18} {err}")
        print(f"\nTotal: {len(jobs)} job(s) with errors")


def force_complete(args: argparse.Namespace) -> None:
    with sync_session_factory() as db:
        job = db.execute(
            select(ImportJob).where(ImportJob.id == uuid.UUID(args.job_id))
        ).scalar_one_or_none()
        if job is None:
            print(f"Error: import job '{args.job_id}' not found")
            sys.exit(1)

        job.status = ImportStatus.COMPLETED
        job.completed_at = datetime.now(UTC)
        if job.error_message:
            job.error_message += " [Force-completed via CLI]"
        else:
            job.error_message = "[Force-completed via CLI]"
        db.commit()
        print(f"Force-completed job {job.id} (was '{args.job_id}')")


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli", description="FamilyFinance user management")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-user
    p_create = subparsers.add_parser("create-user", help="Create a new user")
    p_create.add_argument("--username", required=True)
    p_create.add_argument("--email", required=True)
    p_create.add_argument("--password", required=True)
    p_create.add_argument("--admin", action="store_true", default=False)
    p_create.set_defaults(func=create_user)

    # list-users
    p_list = subparsers.add_parser("list-users", help="List all users")
    p_list.set_defaults(func=list_users)

    # set-admin
    p_admin = subparsers.add_parser("set-admin", help="Grant or revoke admin")
    p_admin.add_argument("--username", required=True)
    group = p_admin.add_mutually_exclusive_group(required=True)
    group.add_argument("--admin", action="store_true", dest="admin")
    group.add_argument("--no-admin", action="store_false", dest="admin")
    p_admin.set_defaults(func=set_admin)

    # set-active
    p_active = subparsers.add_parser("set-active", help="Activate or deactivate a user")
    p_active.add_argument("--username", required=True)
    group2 = p_active.add_mutually_exclusive_group(required=True)
    group2.add_argument("--active", action="store_false", dest="inactive")
    group2.add_argument("--inactive", action="store_true", dest="inactive")
    p_active.set_defaults(func=set_active)

    # reset-password
    p_reset = subparsers.add_parser("reset-password", help="Reset user password")
    p_reset.add_argument("--username", required=True)
    p_reset.add_argument("--password", required=True)
    p_reset.set_defaults(func=reset_password)

    # retry-categorize
    p_retry = subparsers.add_parser("retry-categorize", help="Re-run AI categorization for a job")
    p_retry.add_argument("--job-id", required=True, help="ImportJob UUID")
    p_retry.set_defaults(func=retry_categorize)

    # import-errors
    p_errors = subparsers.add_parser("import-errors", help="Show import jobs with errors")
    p_errors.add_argument("--job-id", required=False, default=None, help="Specific job UUID")
    p_errors.set_defaults(func=import_errors)

    # force-complete
    p_force = subparsers.add_parser("force-complete", help="Force an import job to COMPLETED")
    p_force.add_argument("--job-id", required=True, help="ImportJob UUID")
    p_force.set_defaults(func=force_complete)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
