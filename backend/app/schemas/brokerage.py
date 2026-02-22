from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class HoldingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    account_id: uuid.UUID
    statement_id: uuid.UUID | None
    symbol: str
    name: str
    quantity: Decimal
    cost_basis_cents: int | None
    market_value_cents: int
    unrealized_gain_cents: int | None
    snapshot_date: date

    model_config = {"from_attributes": True}


class AssetAllocationItem(BaseModel):
    category: str
    amount_cents: int
    percentage: float


class NetWorthBreakdownItem(BaseModel):
    label: str
    amount_cents: int
    type: str


class NetWorthSummaryResponse(BaseModel):
    total_assets_cents: int
    total_liabilities_cents: int
    net_worth_cents: int
    breakdown: list[NetWorthBreakdownItem]


class NetWorthHistoryPoint(BaseModel):
    date: date
    net_worth_cents: int
