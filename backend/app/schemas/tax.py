from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class TaxDocumentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    statement_id: uuid.UUID
    form_type: str
    tax_year: int
    issuer: str
    extracted_data: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IncomeBreakdownItem(BaseModel):
    source: str
    amount_cents: int
    description: str


class TaxSummaryResponse(BaseModel):
    gross_income_cents: int
    total_tax_cents: int
    effective_rate: float
    total_deductions_cents: int
