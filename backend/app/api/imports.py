from __future__ import annotations

import asyncio
import json
import uuid

import redis
from celery import chain
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.import_job import ImportJob, ImportStatus
from app.models.user import User
from app.plugins import registry
from app.schemas.import_job import ImportJobResponse
from app.tasks.import_tasks import categorize_import_task, process_import_task

router = APIRouter(prefix="/imports", tags=["imports"])

TERMINAL_STATUSES = {
    ImportStatus.COMPLETED,
    ImportStatus.FAILED,
    ImportStatus.PARTIALLY_FAILED,
}


@router.get("/history", response_model=dict)
async def import_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(ImportJob)
        .where(ImportJob.user_id == current_user.id)
        .order_by(ImportJob.created_at.desc())
    )
    jobs = result.scalars().all()
    return {
        "data": [ImportJobResponse.model_validate(j) for j in jobs],
        "total": len(jobs),
    }


@router.post("/upload", response_model=dict, status_code=202)
async def upload_file(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if file.filename is None:
        raise HTTPException(status_code=400, detail="No filename provided")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    # Validate that a parser can handle this file
    registry.discover()
    parsers = registry.get_all("parser")
    parser_found = any(p.detect(content, file.filename) for p in parsers.values())
    if not parser_found:
        # Attempt AI-based schema inference before rejecting the file
        try:
            from app.services.schema_inference_service import infer_and_save_schema

            await infer_and_save_schema(db, file.filename, content)
            schema_parser = registry.get("parser", "schema_based")
            if schema_parser is not None:
                schema_parser.reload_schemas()
                if schema_parser.detect(content, file.filename):
                    parser_found = True
        except Exception:
            pass  # fall through to original error
        if not parser_found:
            raise HTTPException(status_code=400, detail="No parser found for this file format")

    # Create PENDING job
    job = ImportJob(
        user_id=current_user.id,
        filename=file.filename,
        source_type="unknown",
        status=ImportStatus.PENDING,
        source="upload",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    job_id_str = str(job.id)

    # Store file content in Redis with 1h TTL
    r = redis.Redis.from_url(settings.REDIS_URL)
    r.set(f"import_file:{job_id_str}", content, ex=3600)

    # Dispatch Celery chain: process → categorize
    task_chain = chain(
        process_import_task.s(job_id_str, None),
        categorize_import_task.s(),
    )
    result = task_chain.apply_async()

    # Store celery task ID on the job
    job.celery_task_id = result.id
    await db.commit()

    return {"data": ImportJobResponse.model_validate(job)}


@router.post("/{job_id}/retry-categorize", response_model=dict)
async def retry_categorize(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(ImportJob).where(
            ImportJob.id == job_id,
            ImportJob.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found")
    if job.status not in (ImportStatus.COMPLETED, ImportStatus.PARTIALLY_FAILED):
        raise HTTPException(
            status_code=400,
            detail=f"Job status is '{job.status.value}', must be 'completed' or 'partially_failed'",
        )

    task_result = categorize_import_task.apply_async(
        ({"job_id": str(job.id), "status": job.status.value},)
    )
    return {"data": {"task_id": task_result.id, "job_id": str(job.id)}}


@router.get("/{job_id}", response_model=dict)
async def get_import_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(ImportJob).where(
            ImportJob.id == job_id,
            ImportJob.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found")
    return {"data": ImportJobResponse.model_validate(job)}


@router.get("/{job_id}/progress")
async def import_job_progress(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    # Verify ownership once
    result = await db.execute(
        select(ImportJob).where(
            ImportJob.id == job_id,
            ImportJob.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found")

    async def event_stream():
        from app.database import async_session_factory

        while True:
            async with async_session_factory() as session:
                result = await session.execute(
                    select(ImportJob).where(ImportJob.id == job_id)
                )
                job = result.scalar_one_or_none()
                if job is None:
                    break

                data = ImportJobResponse.model_validate(job).model_dump(mode="json")
                yield f"data: {json.dumps(data)}\n\n"

                if job.status in TERMINAL_STATUSES:
                    break

            await asyncio.sleep(2)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
