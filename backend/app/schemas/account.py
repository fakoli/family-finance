from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.institution import InstitutionResponse


class AccountCreate(BaseModel):
    institution_id: uuid.UUID
    name: str
    account_type: str
    account_number_last4: str | None = None
    is_shared: bool = False


class AccountUpdate(BaseModel):
    name: str | None = None
    account_type: str | None = None
    is_shared: bool | None = None


class AccountResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    institution_id: uuid.UUID
    name: str
    account_type: str
    account_number_last4: str | None
    is_shared: bool
    balance_cents: int
    institution: InstitutionResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
