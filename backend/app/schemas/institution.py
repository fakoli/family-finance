from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class InstitutionResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
