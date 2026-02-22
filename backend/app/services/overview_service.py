from __future__ import annotations

import calendar
import uuid
from datetime import date

from sqlalchemy import case, extract, select
from sqlalchemy import func as sql_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account, AccountType
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.overview import (
    BalanceSheet,
    BalanceSheetEntry,
    CategorySpending,
    MerchantDeepDive,
    MerchantTotal,
    MonthlyMerchantData,
    MonthlyTrend,
    OverviewKPIs,
    SpendingBreakdown,
    SubscriptionEntry,
    SubscriptionList,
)

ASSET_TYPES = {
    AccountType.CHECKING,
    AccountType.SAVINGS,
    AccountType.BROKERAGE,
    AccountType.RETIREMENT,
    AccountType.HSA,
    AccountType.CRYPTO,
    AccountType.CASH,
}
LIABILITY_TYPES = {
    AccountType.CREDIT_CARD,
    AccountType.LOAN,
    AccountType.MORTGAGE,
}

MONTH_NAMES = {i: calendar.month_abbr[i] for i in range(1, 13)}


def _user_accounts_subq(user_id: uuid.UUID):
    return select(Account.id).where(Account.user_id == user_id)


def _year_filters(user_id: uuid.UUID, year: int):
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    return [
        Transaction.account_id.in_(_user_accounts_subq(user_id)),
        Transaction.date >= start,
        Transaction.date <= end,
    ]


async def get_spending_breakdown(
    db: AsyncSession, user_id: uuid.UUID, year: int
) -> SpendingBreakdown:
    filters = [
        *_year_filters(user_id, year),
        Transaction.amount_cents > 0,
        ~Transaction.is_transfer,
    ]

    # Count distinct months with data for accurate monthly average
    months_q = await db.execute(
        select(sql_func.count(sql_func.distinct(extract("month", Transaction.date)))).where(
            *filters
        )
    )
    num_months = max(months_q.scalar_one(), 1)

    # Category totals
    cat_q = await db.execute(
        select(
            Transaction.category_id,
            sql_func.coalesce(Category.name, "Uncategorized").label("category_name"),
            sql_func.sum(Transaction.amount_cents).label("total"),
            sql_func.count().label("cnt"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(*filters)
        .group_by(Transaction.category_id, Category.name)
        .order_by(sql_func.sum(Transaction.amount_cents).desc())
    )
    cat_rows = cat_q.all()

    total_spending = sum(int(r.total) for r in cat_rows)

    # Top merchants per category
    categories: list[CategorySpending] = []
    for row in cat_rows:
        merchant_filters = [*filters]
        if row.category_id is not None:
            merchant_filters.append(Transaction.category_id == row.category_id)
        else:
            merchant_filters.append(Transaction.category_id.is_(None))

        merchant_q = await db.execute(
            select(
                sql_func.coalesce(Transaction.merchant_name, Transaction.description).label(
                    "merchant"
                ),
                sql_func.sum(Transaction.amount_cents).label("total"),
                sql_func.count().label("cnt"),
            )
            .where(*merchant_filters)
            .group_by("merchant")
            .order_by(sql_func.sum(Transaction.amount_cents).desc())
            .limit(5)
        )
        top_merchants = [
            MerchantTotal(
                merchant_name=m.merchant or "Unknown",
                total_cents=int(m.total),
                transaction_count=int(m.cnt),
            )
            for m in merchant_q.all()
        ]

        annual = int(row.total)
        categories.append(
            CategorySpending(
                category_id=row.category_id,
                category_name=row.category_name,
                annual_cents=annual,
                monthly_average_cents=annual // num_months,
                transaction_count=int(row.cnt),
                top_merchants=top_merchants,
            )
        )

    return SpendingBreakdown(
        year=year,
        total_spending_cents=total_spending,
        monthly_average_cents=total_spending // num_months,
        categories=categories,
    )


async def get_merchant_deep_dive(
    db: AsyncSession, user_id: uuid.UUID, merchant_name: str, year: int
) -> MerchantDeepDive:
    filters = [
        *_year_filters(user_id, year),
        Transaction.amount_cents > 0,
        sql_func.coalesce(Transaction.merchant_name, Transaction.description).ilike(
            f"%{merchant_name}%"
        ),
    ]

    # Monthly breakdown
    monthly_q = await db.execute(
        select(
            extract("month", Transaction.date).label("month"),
            sql_func.sum(Transaction.amount_cents).label("total"),
            sql_func.count().label("cnt"),
        )
        .where(*filters)
        .group_by("month")
        .order_by("month")
    )
    monthly_rows = monthly_q.all()

    total = sum(int(r.total) for r in monthly_rows)
    order_count = sum(int(r.cnt) for r in monthly_rows)

    monthly = [
        MonthlyMerchantData(
            month=int(r.month),
            month_name=MONTH_NAMES.get(int(r.month), ""),
            total_cents=int(r.total),
            order_count=int(r.cnt),
        )
        for r in monthly_rows
    ]

    return MerchantDeepDive(
        merchant_name=merchant_name,
        year=year,
        total_cents=total,
        order_count=order_count,
        average_order_cents=total // max(order_count, 1),
        monthly=monthly,
    )


async def get_balance_sheet(db: AsyncSession, user_id: uuid.UUID) -> BalanceSheet:
    acct_q = await db.execute(
        select(Account).where(Account.user_id == user_id).order_by(Account.name)
    )
    accounts = acct_q.scalars().all()

    assets: list[BalanceSheetEntry] = []
    liabilities: list[BalanceSheetEntry] = []

    for a in accounts:
        entry = BalanceSheetEntry(
            account_id=a.id,
            account_name=a.name,
            institution_name=a.institution.name if a.institution else "Unknown",
            account_type=a.account_type.value,
            balance_cents=a.balance_cents,
            account_number_last4=a.account_number_last4,
        )
        if a.account_type in ASSET_TYPES:
            assets.append(entry)
        elif a.account_type in LIABILITY_TYPES:
            liabilities.append(entry)

    total_assets = sum(e.balance_cents for e in assets)
    total_liabilities = sum(e.balance_cents for e in liabilities)

    return BalanceSheet(
        assets=assets,
        liabilities=liabilities,
        total_assets_cents=total_assets,
        total_liabilities_cents=total_liabilities,
        net_worth_cents=total_assets - total_liabilities,
    )


async def get_income_expense_trend(
    db: AsyncSession, user_id: uuid.UUID, year: int
) -> list[MonthlyTrend]:
    filters = _year_filters(user_id, year)

    monthly_q = await db.execute(
        select(
            extract("month", Transaction.date).label("month"),
            sql_func.coalesce(
                sql_func.sum(case((Transaction.amount_cents < 0, Transaction.amount_cents))), 0
            ).label("income"),
            sql_func.coalesce(
                sql_func.sum(case((Transaction.amount_cents > 0, Transaction.amount_cents))), 0
            ).label("expenses"),
        )
        .where(*filters)
        .group_by("month")
        .order_by("month")
    )
    rows = monthly_q.all()

    return [
        MonthlyTrend(
            month=int(r.month),
            month_name=MONTH_NAMES.get(int(r.month), ""),
            income_cents=abs(int(r.income)),
            expense_cents=int(r.expenses),
            net_cents=abs(int(r.income)) - int(r.expenses),
        )
        for r in rows
    ]


async def get_subscriptions(
    db: AsyncSession, user_id: uuid.UUID, year: int, category_name: str = "Software & Tech"
) -> SubscriptionList:
    filters = [
        *_year_filters(user_id, year),
        Transaction.amount_cents > 0,
        ~Transaction.is_transfer,
    ]

    # Join category and filter by name
    sub_q = await db.execute(
        select(
            sql_func.coalesce(Transaction.merchant_name, Transaction.description).label(
                "merchant"
            ),
            sql_func.sum(Transaction.amount_cents).label("total"),
            sql_func.count().label("cnt"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(*filters, sql_func.coalesce(Category.name, "Uncategorized") == category_name)
        .group_by("merchant")
        .order_by(sql_func.sum(Transaction.amount_cents).desc())
    )
    rows = sub_q.all()

    # Count distinct months for monthly average
    months_q = await db.execute(
        select(sql_func.count(sql_func.distinct(extract("month", Transaction.date)))).where(
            *_year_filters(user_id, year),
            Transaction.amount_cents > 0,
        )
    )
    num_months = max(months_q.scalar_one(), 1)

    total_annual = sum(int(r.total) for r in rows)

    subscriptions = [
        SubscriptionEntry(
            merchant_name=r.merchant or "Unknown",
            annual_cents=int(r.total),
            monthly_average_cents=int(r.total) // num_months,
            charge_count=int(r.cnt),
            frequency="Monthly" if int(r.cnt) >= 6 else "Annual" if int(r.cnt) <= 2 else None,
        )
        for r in rows
    ]

    return SubscriptionList(
        category_name=category_name,
        total_annual_cents=total_annual,
        subscriptions=subscriptions,
    )


async def get_overview_kpis(
    db: AsyncSession, user_id: uuid.UUID, year: int
) -> OverviewKPIs:
    filters = _year_filters(user_id, year)

    totals_q = await db.execute(
        select(
            sql_func.coalesce(
                sql_func.sum(case((Transaction.amount_cents < 0, Transaction.amount_cents))), 0
            ).label("income"),
            sql_func.coalesce(
                sql_func.sum(
                    case(
                        (
                            (Transaction.amount_cents > 0) & (~Transaction.is_transfer),
                            Transaction.amount_cents,
                        )
                    )
                ),
                0,
            ).label("spending"),
            sql_func.count().label("txn_count"),
        ).where(*filters)
    )
    row = totals_q.one()
    income = abs(int(row.income))
    spending = int(row.spending)
    txn_count = int(row.txn_count)

    # Count distinct months for monthly average
    months_q = await db.execute(
        select(sql_func.count(sql_func.distinct(extract("month", Transaction.date)))).where(
            *filters
        )
    )
    num_months = max(months_q.scalar_one(), 1)

    # Estimate fixed obligations: recurring large charges (mortgage, loan payments)
    # Heuristic: transactions appearing 6+ times/year with similar amounts
    fixed_q = await db.execute(
        select(
            sql_func.coalesce(Transaction.merchant_name, Transaction.description).label(
                "merchant"
            ),
            sql_func.avg(Transaction.amount_cents).label("avg_amount"),
            sql_func.count().label("cnt"),
        )
        .where(
            *filters,
            Transaction.amount_cents > 0,
            ~Transaction.is_transfer,
        )
        .group_by("merchant")
        .having(sql_func.count() >= 6)
        .having(sql_func.avg(Transaction.amount_cents) > 30000)  # >$300/mo
    )
    fixed_rows = fixed_q.all()
    monthly_fixed = sum(int(r.avg_amount) for r in fixed_rows)

    return OverviewKPIs(
        total_income_cents=income,
        total_spending_cents=spending,
        monthly_spending_average_cents=spending // num_months,
        monthly_fixed_obligations_cents=monthly_fixed,
        transaction_count=txn_count,
        date_range_start=f"{year}-01-01",
        date_range_end=f"{year}-12-31",
    )
