from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.overview_service import (
    get_balance_sheet,
    get_income_expense_trend,
    get_merchant_deep_dive,
    get_overview_kpis,
    get_spending_breakdown,
    get_subscriptions,
)

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("/spending-breakdown", response_model=dict)
async def spending_breakdown(
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = await get_spending_breakdown(db, current_user.id, year)
    return {"data": data}


@router.get("/merchant-deep-dive", response_model=dict)
async def merchant_deep_dive(
    merchant_name: str = Query(...),
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = await get_merchant_deep_dive(db, current_user.id, merchant_name, year)
    return {"data": data}


@router.get("/balance-sheet", response_model=dict)
async def balance_sheet(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = await get_balance_sheet(db, current_user.id)
    return {"data": data}


@router.get("/income-expense-trend", response_model=dict)
async def income_expense_trend(
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = await get_income_expense_trend(db, current_user.id, year)
    return {"data": data}


@router.get("/subscriptions", response_model=dict)
async def subscriptions(
    year: int = Query(..., ge=2000, le=2100),
    category_name: str = Query("Software & Tech"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = await get_subscriptions(db, current_user.id, year, category_name)
    return {"data": data}


@router.get("/kpi-cards", response_model=dict)
async def kpi_cards(
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = await get_overview_kpis(db, current_user.id, year)
    return {"data": data}
