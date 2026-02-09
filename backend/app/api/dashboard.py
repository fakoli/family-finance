from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, select, func as sql_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.dashboard import AccountBalance, DashboardSummary, SpendingByCategory

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=dict)
async def summary(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    user_accounts = select(Account.id).where(Account.user_id == current_user.id)

    # Build date filter
    date_filters = [Transaction.account_id.in_(user_accounts)]
    if date_from is not None:
        date_filters.append(Transaction.date >= date_from)
    if date_to is not None:
        date_filters.append(Transaction.date <= date_to)

    # Income vs expense (negative amount = income in Rocket Money)
    totals_result = await db.execute(
        select(
            sql_func.coalesce(
                sql_func.sum(case((Transaction.amount_cents < 0, Transaction.amount_cents))), 0
            ).label("income"),
            sql_func.coalesce(
                sql_func.sum(case((Transaction.amount_cents > 0, Transaction.amount_cents))), 0
            ).label("expenses"),
            sql_func.count().label("txn_count"),
        ).where(*date_filters)
    )
    row = totals_result.one()
    income_cents = abs(int(row.income))
    expense_cents = int(row.expenses)
    txn_count = int(row.txn_count)

    # Spending by category (expenses only)
    cat_result = await db.execute(
        select(
            Transaction.category_id,
            sql_func.coalesce(Category.name, "Uncategorized").label("category_name"),
            sql_func.sum(Transaction.amount_cents).label("total"),
            sql_func.count().label("cnt"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(*date_filters, Transaction.amount_cents > 0)
        .group_by(Transaction.category_id, Category.name)
        .order_by(sql_func.sum(Transaction.amount_cents).desc())
    )
    spending = [
        SpendingByCategory(
            category_id=r.category_id,
            category_name=r.category_name,
            total_cents=int(r.total),
            transaction_count=int(r.cnt),
        )
        for r in cat_result.all()
    ]

    # Account balances
    acct_result = await db.execute(
        select(Account).where(Account.user_id == current_user.id).order_by(Account.name)
    )
    accounts = acct_result.scalars().all()
    balances = [
        AccountBalance(
            account_id=a.id,
            account_name=a.name,
            institution_name=a.institution.name if a.institution else "Unknown",
            account_type=a.account_type.value,
            balance_cents=a.balance_cents,
        )
        for a in accounts
    ]

    return {
        "data": DashboardSummary(
            income_cents=income_cents,
            expense_cents=expense_cents,
            net_cents=income_cents - expense_cents,
            spending_by_category=spending,
            account_balances=balances,
            transaction_count=txn_count,
        )
    }
