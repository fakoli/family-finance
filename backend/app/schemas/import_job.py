from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ImportJobResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    source_type: str
    status: Literal[
        "pending", "processing", "completed", "failed", "categorizing", "partially_failed"
    ]
    total_rows: int
    imported_rows: int
    duplicate_rows: int
    processed_rows: int
    categorized_rows: int
    uncategorized_rows: int
    error_message: str | None
    celery_task_id: str | None
    source: str
    file_path: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}
