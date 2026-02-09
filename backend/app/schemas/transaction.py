from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.account import AccountResponse
from app.schemas.category import CategoryResponse


class TransactionUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    custom_name: str | None = None
    note: str | None = None
    is_transfer: bool | None = None
    is_tax_deductible: bool | None = None
    tags: dict | None = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    date: date
    original_date: date | None
    amount_cents: int
    description: str
    original_description: str | None
    merchant_name: str | None
    category_id: uuid.UUID | None
    custom_name: str | None
    note: str | None
    is_transfer: bool
    is_tax_deductible: bool
    tags: dict | None
    import_job_id: uuid.UUID | None
    account: AccountResponse | None = None
    category: CategoryResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    data: list[TransactionResponse]
    total: int
