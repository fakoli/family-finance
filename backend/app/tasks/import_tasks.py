from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

import redis
from celery import chain
from sqlalchemy import select

from app.config import settings
from app.database import sync_session_factory
from app.models.category import Category
from app.models.import_job import ImportJob, ImportStatus
from app.models.transaction import Transaction
from app.plugins import registry
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".csv", ".ofx", ".qfx"}


def _ensure_plugins() -> None:
    """Discover plugins if not already loaded."""
    if not registry.get_all("parser"):
        registry.discover()


@celery_app.task(name="app.tasks.import_tasks.scan_import_directory")
def scan_import_directory() -> dict:
    """Periodic task: scan IMPORT_WATCH_DIR for new files and dispatch imports."""
    watch_dir = settings.IMPORT_WATCH_DIR
    default_user_id = settings.IMPORT_DEFAULT_USER_ID

    if not default_user_id:
        return {"skipped": True, "reason": "IMPORT_DEFAULT_USER_ID not configured"}

    if not os.path.isdir(watch_dir):
        return {"skipped": True, "reason": f"Watch directory {watch_dir} does not exist"}

    dispatched = []
    with sync_session_factory() as db:
        for entry in os.scandir(watch_dir):
            if not entry.is_file():
                continue
            ext = Path(entry.name).suffix.lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            # Check if this file was already imported
            existing = db.execute(
                select(ImportJob.id).where(
                    ImportJob.filename == entry.name,
                    ImportJob.source == "watch",
                )
            ).scalar_one_or_none()

            if existing is not None:
                continue

            # Create a PENDING job
            job = ImportJob(
                user_id=uuid.UUID(default_user_id),
                filename=entry.name,
                source_type="unknown",
                status=ImportStatus.PENDING,
                source="watch",
                file_path=entry.path,
            )
            db.add(job)
            db.commit()
            db.refresh(job)

            job_id_str = str(job.id)
            # Dispatch the import → categorize chain
            chain(
                process_import_task.s(job_id_str, entry.path),
                categorize_import_task.s(),
            ).apply_async()

            dispatched.append(entry.name)
            logger.info("Dispatched import for watched file: %s (job %s)", entry.name, job_id_str)

    return {"dispatched": dispatched, "count": len(dispatched)}


@celery_app.task(
    name="app.tasks.import_tasks.process_import_task",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def process_import_task(self, job_id: str, file_path: str | None) -> dict:  # type: ignore[no-untyped-def]
    """Process an import job. Reads file from disk (watch) or Redis (upload)."""
    from app.services.import_service import run_import_sync

    _ensure_plugins()

    job_uuid = uuid.UUID(job_id)

    with sync_session_factory() as db:
        job = db.execute(select(ImportJob).where(ImportJob.id == job_uuid)).scalar_one_or_none()
        if job is None:
            logger.error("ImportJob %s not found", job_id)
            return {"job_id": job_id, "status": "failed", "error": "Job not found"}

        # Read file content
        if file_path and os.path.isfile(file_path):
            with open(file_path, "rb") as f:
                file_content = f.read()
        else:
            # Try Redis (uploaded file)
            redis_key = f"import_file:{job_id}"
            r = redis.Redis.from_url(settings.REDIS_URL)
            file_content = r.get(redis_key)
            if file_content is None:
                job.status = ImportStatus.FAILED
                job.error_message = "File content not found in Redis or on disk"
                db.commit()
                return {"job_id": job_id, "status": "failed", "error": "File not found"}

        def on_progress(count: int) -> None:
            logger.info("Import %s: processed %d rows", job_id, count)

        try:
            result_job = run_import_sync(
                db=db,
                user_id=job.user_id,
                filename=job.filename,
                file_content=file_content,
                job_id=job_uuid,
                on_progress=on_progress,
            )

            # Clean up Redis file after successful processing
            redis_key = f"import_file:{job_id}"
            r = redis.Redis.from_url(settings.REDIS_URL)
            r.delete(redis_key)

            return {
                "job_id": job_id,
                "status": result_job.status.value,
                "imported": result_job.imported_rows,
                "duplicates": result_job.duplicate_rows,
                "total": result_job.total_rows,
            }

        except Exception as exc:
            logger.exception("Import task failed for job %s", job_id)
            db.rollback()
            job = db.execute(
                select(ImportJob).where(ImportJob.id == job_uuid)
            ).scalar_one()
            job.status = ImportStatus.FAILED
            job.error_message = str(exc)[:1000]
            db.commit()
            # Return error dict if retries exhausted, otherwise retry
            if self.request.retries >= self.max_retries:
                return {"job_id": job_id, "status": "failed", "error": str(exc)[:500]}
            raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.import_tasks.categorize_import_task")
def categorize_import_task(import_result: dict) -> dict:
    """Categorize uncategorized transactions from a completed import.

    Categorization is best-effort: failures are logged as warnings and never
    prevent the job from reaching COMPLETED status.
    """
    job_id = import_result.get("job_id")
    status = import_result.get("status")

    if not job_id or status == "failed":
        return {"job_id": job_id, "skipped": True, "reason": "Import failed or missing"}

    job_uuid = uuid.UUID(job_id)

    with sync_session_factory() as db:
        job = db.execute(select(ImportJob).where(ImportJob.id == job_uuid)).scalar_one_or_none()
        if job is None:
            return {"job_id": job_id, "skipped": True, "reason": "Job not found"}

        # Find uncategorized transactions from this import
        uncat = db.execute(
            select(Category).where(Category.name == "Uncategorized")
        ).scalar_one_or_none()

        if uncat is None:
            # No "Uncategorized" category exists, nothing to categorize
            job.status = ImportStatus.COMPLETED
            job.completed_at = datetime.now(UTC)
            db.commit()
            return {"job_id": job_id, "categorized": 0, "total": 0}

        txn_result = db.execute(
            select(Transaction).where(
                Transaction.import_job_id == job_uuid,
                Transaction.category_id == uncat.id,
            )
        )
        uncategorized_txns = txn_result.scalars().all()

        if not uncategorized_txns:
            job.status = ImportStatus.COMPLETED
            job.completed_at = datetime.now(UTC)
            db.commit()
            return {"job_id": job_id, "categorized": 0, "total": 0}

        job.status = ImportStatus.CATEGORIZING
        job.uncategorized_rows = len(uncategorized_txns)
        db.commit()

        txn_ids = [txn.id for txn in uncategorized_txns]

    # Run categorization using the async service with a single event loop
    from app.services.categorization_service import categorize_batch

    _ensure_plugins()

    batch_size = 20
    categorized = 0
    categorization_errors: list[str] = []

    loop = asyncio.new_event_loop()
    try:
        for start in range(0, len(txn_ids), batch_size):
            batch_ids = txn_ids[start : start + batch_size]
            batch_num = start // batch_size + 1

            try:

                async def _categorize_batch(ids: list) -> list:
                    from app.database import async_session_factory

                    async with async_session_factory() as async_db:
                        results = await categorize_batch(async_db, ids)
                        return results

                results = loop.run_until_complete(_categorize_batch(batch_ids))

                for r in results:
                    if r["category_name"] != "Uncategorized":
                        categorized += 1

                # Update progress
                with sync_session_factory() as db:
                    job = db.execute(
                        select(ImportJob).where(ImportJob.id == job_uuid)
                    ).scalar_one()
                    job.categorized_rows = categorized
                    db.commit()

            except Exception as exc:
                msg = f"Batch {batch_num}: {exc!s}"
                categorization_errors.append(msg)
                logger.warning(
                    "Categorization batch %d failed for job %s: %s",
                    batch_num,
                    job_id,
                    exc,
                )
    finally:
        loop.close()

    # Always mark completed — categorization is best-effort
    with sync_session_factory() as db:
        job = db.execute(
            select(ImportJob).where(ImportJob.id == job_uuid)
        ).scalar_one()
        job.status = ImportStatus.COMPLETED
        job.completed_at = datetime.now(UTC)
        if categorization_errors:
            job.error_message = (
                f"Categorization warnings ({len(categorization_errors)} batches): "
                f"{'; '.join(categorization_errors[:5])}"
            )
        db.commit()

    return {
        "job_id": job_id,
        "categorized": categorized,
        "total": len(txn_ids),
        "warnings": len(categorization_errors),
    }
