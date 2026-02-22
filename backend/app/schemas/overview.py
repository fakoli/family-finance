from __future__ import annotations

import uuid

from pydantic import BaseModel


class MerchantTotal(BaseModel):
    merchant_name: str
    total_cents: int
    transaction_count: int


class CategorySpending(BaseModel):
    category_id: uuid.UUID | None
    category_name: str
    annual_cents: int
    monthly_average_cents: int
    transaction_count: int
    top_merchants: list[MerchantTotal]


class SpendingBreakdown(BaseModel):
    year: int
    total_spending_cents: int
    monthly_average_cents: int
    categories: list[CategorySpending]


class MonthlyMerchantData(BaseModel):
    month: int
    month_name: str
    total_cents: int
    order_count: int


class MerchantDeepDive(BaseModel):
    merchant_name: str
    year: int
    total_cents: int
    order_count: int
    average_order_cents: int
    monthly: list[MonthlyMerchantData]


class BalanceSheetEntry(BaseModel):
    account_id: uuid.UUID
    account_name: str
    institution_name: str
    account_type: str
    balance_cents: int
    account_number_last4: str | None


class BalanceSheet(BaseModel):
    assets: list[BalanceSheetEntry]
    liabilities: list[BalanceSheetEntry]
    total_assets_cents: int
    total_liabilities_cents: int
    net_worth_cents: int


class MonthlyTrend(BaseModel):
    month: int
    month_name: str
    income_cents: int
    expense_cents: int
    net_cents: int


class SubscriptionEntry(BaseModel):
    merchant_name: str
    annual_cents: int
    monthly_average_cents: int
    charge_count: int
    frequency: str | None


class SubscriptionList(BaseModel):
    category_name: str
    total_annual_cents: int
    subscriptions: list[SubscriptionEntry]


class OverviewKPIs(BaseModel):
    total_income_cents: int
    total_spending_cents: int
    monthly_spending_average_cents: int
    monthly_fixed_obligations_cents: int
    transaction_count: int
    date_range_start: str
    date_range_end: str
