from __future__ import annotations

import uuid

from pydantic import BaseModel


class SpendingByCategory(BaseModel):
    category_id: uuid.UUID | None
    category_name: str
    total_cents: int
    transaction_count: int


class AccountBalance(BaseModel):
    account_id: uuid.UUID
    account_name: str
    institution_name: str
    account_type: str
    balance_cents: int


class DashboardSummary(BaseModel):
    income_cents: int
    expense_cents: int
    net_cents: int
    spending_by_category: list[SpendingByCategory]
    account_balances: list[AccountBalance]
    transaction_count: int
