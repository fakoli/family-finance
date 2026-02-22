from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.database import sync_session_factory
from app.models.user import User
from app.schemas.tax import (
    IncomeBreakdownItem,
    TaxDocumentResponse,
    TaxSummaryResponse,
)
from app.schemas.transaction import TransactionResponse
from app.services.tax_service import (
    get_income_breakdown,
    get_tax_deductible_transactions,
    get_tax_documents,
    get_tax_summary,
)

router = APIRouter(prefix="/tax", tags=["tax"])


@router.get("/summary", response_model=dict)
async def tax_summary(
    year: int = Query(..., description="Tax year"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Tax summary for a year."""

    def _query() -> dict:
        with sync_session_factory() as db:
            return get_tax_summary(db, current_user.id, year)

    data = await asyncio.to_thread(_query)
    return {"data": TaxSummaryResponse(**data)}


@router.get("/documents", response_model=dict)
async def tax_documents(
    year: int = Query(..., description="Tax year"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """All tax documents with status for a year."""

    def _query() -> list:
        with sync_session_factory() as db:
            rows = get_tax_documents(db, current_user.id, year)
            return [TaxDocumentResponse.model_validate(d) for d in rows]

    data = await asyncio.to_thread(_query)
    return {"data": data, "total": len(data)}


@router.get("/income-breakdown", response_model=dict)
async def income_breakdown(
    year: int = Query(..., description="Tax year"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Income sources breakdown for a year."""

    def _query() -> list[dict]:
        with sync_session_factory() as db:
            return get_income_breakdown(db, current_user.id, year)

    rows = await asyncio.to_thread(_query)
    return {"data": [IncomeBreakdownItem(**r) for r in rows]}


@router.get("/deductible", response_model=dict)
async def tax_deductible(
    year: int = Query(..., description="Tax year"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Tax-deductible transactions for a year."""

    def _query() -> list:
        with sync_session_factory() as db:
            rows = get_tax_deductible_transactions(db, current_user.id, year)
            return [TransactionResponse.model_validate(t) for t in rows]

    data = await asyncio.to_thread(_query)
    return {"data": data, "total": len(data)}
