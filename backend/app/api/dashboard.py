from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.dashboard_service import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=dict)
async def summary(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = await get_dashboard_summary(db, current_user.id, date_from, date_to)
    return {"data": data}
