from __future__ import annotations

import uuid

from pydantic import BaseModel


class CategorizeRequest(BaseModel):
    transaction_ids: list[uuid.UUID]
    provider: str | None = None


class CategorizeResult(BaseModel):
    transaction_id: uuid.UUID
    category_name: str
    confidence: float
    merchant_normalized: str | None = None


class CategorizeResponse(BaseModel):
    results: list[CategorizeResult]


class QueryRequest(BaseModel):
    question: str
    provider: str | None = None


class QueryResponse(BaseModel):
    answer: str
    data: dict | None = None
