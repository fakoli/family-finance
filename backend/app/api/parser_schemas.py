from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user
from app.database import get_db
from app.models.parser_schema import ParserSchema
from app.models.user import User

router = APIRouter(prefix="/parser-schemas", tags=["parser-schemas"])


class ParserSchemaResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None
    file_type: str
    detection_rules: dict
    column_mapping: dict
    transform_rules: dict
    is_active: bool
    created_by_ai: bool
    sample_data: dict | None
    created_at: datetime
    updated_at: datetime


class ParserSchemaUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    file_type: str | None = None
    detection_rules: dict | None = None
    column_mapping: dict | None = None
    transform_rules: dict | None = None
    is_active: bool | None = None


@router.get("", response_model=dict)
async def list_schemas(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(
        select(ParserSchema).order_by(ParserSchema.created_at.desc())
    )
    schemas = result.scalars().all()
    return {
        "data": [ParserSchemaResponse.model_validate(s) for s in schemas],
        "total": len(schemas),
    }


@router.get("/{schema_id}", response_model=dict)
async def get_schema(
    schema_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(
        select(ParserSchema).where(ParserSchema.id == schema_id)
    )
    schema = result.scalar_one_or_none()
    if schema is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schema not found")
    return {"data": ParserSchemaResponse.model_validate(schema)}


@router.patch("/{schema_id}", response_model=dict)
async def update_schema(
    schema_id: uuid.UUID,
    body: ParserSchemaUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(
        select(ParserSchema).where(ParserSchema.id == schema_id)
    )
    schema = result.scalar_one_or_none()
    if schema is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schema not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schema, field, value)

    await db.commit()
    await db.refresh(schema)
    return {"data": ParserSchemaResponse.model_validate(schema)}


@router.delete("/{schema_id}", status_code=204)
async def delete_schema(
    schema_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> None:
    result = await db.execute(
        select(ParserSchema).where(ParserSchema.id == schema_id)
    )
    schema = result.scalar_one_or_none()
    if schema is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schema not found")

    await db.delete(schema)
    await db.commit()
