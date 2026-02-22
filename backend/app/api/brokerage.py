from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.database import sync_session_factory
from app.models.user import User
from app.schemas.brokerage import (
    AssetAllocationItem,
    HoldingResponse,
    NetWorthHistoryPoint,
    NetWorthSummaryResponse,
)
from app.services.brokerage_service import (
    get_asset_allocation,
    get_holdings,
    get_net_worth_history,
    get_net_worth_summary,
)

router = APIRouter(prefix="/brokerage", tags=["brokerage"])


@router.get("/summary", response_model=dict)
async def net_worth_summary(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Net worth summary (KPI card data)."""

    def _query() -> dict:
        with sync_session_factory() as db:
            return get_net_worth_summary(db, current_user.id)

    data = await asyncio.to_thread(_query)
    return {"data": NetWorthSummaryResponse(**data)}


@router.get("/holdings", response_model=dict)
async def holdings(
    current_user: User = Depends(get_current_user),
) -> dict:
    """All current holdings."""

    def _query() -> list:
        with sync_session_factory() as db:
            rows = get_holdings(db, current_user.id)
            # Validate inside sync context while ORM objects are attached
            return [HoldingResponse.model_validate(h) for h in rows]

    data = await asyncio.to_thread(_query)
    return {"data": data, "total": len(data)}


@router.get("/history", response_model=dict)
async def net_worth_history(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Net worth over time (chart data)."""

    def _query() -> list[dict]:
        with sync_session_factory() as db:
            return get_net_worth_history(db, current_user.id)

    rows = await asyncio.to_thread(_query)
    return {"data": [NetWorthHistoryPoint(**r) for r in rows]}


@router.get("/allocation", response_model=dict)
async def asset_allocation(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Asset allocation breakdown."""

    def _query() -> list[dict]:
        with sync_session_factory() as db:
            return get_asset_allocation(db, current_user.id)

    rows = await asyncio.to_thread(_query)
    return {"data": [AssetAllocationItem(**r) for r in rows]}
