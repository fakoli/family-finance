from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    parent_id: uuid.UUID | None = None
    icon: str | None = None
    color: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    parent_id: uuid.UUID | None = None
    icon: str | None = None
    color: str | None = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    icon: str | None
    color: str | None
    is_system: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryTreeResponse(CategoryResponse):
    children: list[CategoryTreeResponse] = []
