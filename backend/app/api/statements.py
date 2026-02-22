from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sql_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.statement import Statement
from app.models.user import User
from app.schemas.statement import StatementResponse

router = APIRouter(prefix="/statements", tags=["statements"])


@router.get("", response_model=dict)
async def list_statements(
    document_type: str | None = Query(None, description="Filter by document type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """List all imported statements for the current user."""
    filters = [Statement.user_id == current_user.id]
    if document_type is not None:
        filters.append(Statement.document_type == document_type)

    # Get total count
    count_result = await db.execute(select(sql_func.count()).select_from(Statement).where(*filters))
    total = count_result.scalar_one()

    # Get statements
    result = await db.execute(
        select(Statement).where(*filters).order_by(Statement.created_at.desc())
    )
    statements = result.scalars().all()

    return {
        "data": [StatementResponse.model_validate(s) for s in statements],
        "total": total,
    }


@router.get("/{statement_id}", response_model=dict)
async def get_statement(
    statement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get statement details."""
    result = await db.execute(
        select(Statement).where(
            Statement.id == statement_id,
            Statement.user_id == current_user.id,
        )
    )
    statement = result.scalar_one_or_none()

    if statement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Statement not found",
        )

    return {"data": StatementResponse.model_validate(statement)}
