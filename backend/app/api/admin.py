from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user
from app.database import get_db
from app.models.account import Account
from app.models.import_job import ImportJob, ImportStatus
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.import_job import ImportJobResponse
from app.schemas.user import AdminUserCreate, AdminUserResponse, AdminUserUpdate, UserResponse
from app.services.auth_service import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=dict)
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    user_data = []
    for user in users:
        acct_count = await db.scalar(
            select(func.count(Account.id)).where(Account.user_id == user.id)
        )
        txn_count = await db.scalar(
            select(func.count(Transaction.id))
            .join(Account, Transaction.account_id == Account.id)
            .where(Account.user_id == user.id)
        )
        import_count = await db.scalar(
            select(func.count(ImportJob.id)).where(ImportJob.user_id == user.id)
        )
        user_data.append(
            AdminUserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                is_active=user.is_active,
                is_admin=user.is_admin,
                created_at=user.created_at,
                updated_at=user.updated_at,
                account_count=acct_count or 0,
                transaction_count=txn_count or 0,
                import_count=import_count or 0,
            )
        )

    return {"data": user_data, "total": len(user_data)}


@router.post("/users", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    existing = await db.execute(
        select(User).where((User.username == body.username) | (User.email == body.email))
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists",
        )
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        is_admin=body.is_admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"data": UserResponse.model_validate(user)}


@router.patch("/users/{user_id}", response_model=dict)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.password is not None:
        user.hashed_password = hash_password(body.password)

    await db.commit()
    await db.refresh(user)
    return {"data": UserResponse.model_validate(user)}


@router.delete("/users/{user_id}", response_model=dict)
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    await db.commit()
    return {"data": UserResponse.model_validate(user)}


@router.get("/stats", response_model=dict)
async def system_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    total_users = await db.scalar(select(func.count(User.id))) or 0
    active_users = await db.scalar(
        select(func.count(User.id)).where(User.is_active.is_(True))
    ) or 0
    total_transactions = await db.scalar(select(func.count(Transaction.id))) or 0
    total_import_jobs = await db.scalar(select(func.count(ImportJob.id))) or 0
    completed_import_jobs = await db.scalar(
        select(func.count(ImportJob.id)).where(ImportJob.status == "completed")
    ) or 0
    failed_import_jobs = await db.scalar(
        select(func.count(ImportJob.id)).where(ImportJob.status == "failed")
    ) or 0
    partially_failed_import_jobs = await db.scalar(
        select(func.count(ImportJob.id)).where(ImportJob.status == "partially_failed")
    ) or 0

    return {
        "data": {
            "total_users": total_users,
            "active_users": active_users,
            "total_transactions": total_transactions,
            "total_import_jobs": total_import_jobs,
            "completed_import_jobs": completed_import_jobs,
            "failed_import_jobs": failed_import_jobs,
            "partially_failed_import_jobs": partially_failed_import_jobs,
        }
    }


@router.get("/import-jobs", response_model=dict)
async def all_import_jobs(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(
        select(ImportJob).order_by(ImportJob.created_at.desc())
    )
    jobs = result.scalars().all()
    return {
        "data": [ImportJobResponse.model_validate(j) for j in jobs],
        "total": len(jobs),
    }


@router.post("/import-jobs/{job_id}/force-complete", response_model=dict)
async def force_complete_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found")

    job.status = ImportStatus.COMPLETED
    job.completed_at = datetime.now(UTC)
    if job.error_message:
        job.error_message += " [Force-completed by admin]"
    else:
        job.error_message = "[Force-completed by admin]"
    await db.commit()
    await db.refresh(job)
    return {"data": ImportJobResponse.model_validate(job)}
