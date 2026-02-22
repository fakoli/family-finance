from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel


class StatementResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    account_id: uuid.UUID | None
    import_job_id: uuid.UUID | None
    document_type: Literal[
        "bank_statement",
        "credit_card_statement",
        "mortgage_statement",
        "brokerage_statement",
        "tax_form",
    ]
    filename: str
    institution_name: str
    period_start: date | None
    period_end: date | None
    tax_year: int | None
    metadata_: dict[str, Any] | None = None
    file_path: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
