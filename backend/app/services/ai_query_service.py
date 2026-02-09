from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select, func as sql_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.plugins import registry
from app.plugins.base import AIProviderPlugin


def _get_ai_provider(provider_name: str | None = None) -> AIProviderPlugin:
    name = provider_name or settings.DEFAULT_AI_PROVIDER
    provider = registry.get("ai", name)
    if provider is None:
        raise ValueError(
            f"AI provider '{name}' not found. "
            f"Available: {list(registry.get_all('ai').keys())}"
        )
    return provider  # type: ignore[return-value]


async def answer_question(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
    provider_name: str | None = None,
) -> dict[str, Any]:
    provider = _get_ai_provider(provider_name)

    user_accounts = select(Account.id).where(Account.user_id == user_id)

    # Recent transactions (last 100)
    recent_result = await db.execute(
        select(Transaction)
        .where(Transaction.account_id.in_(user_accounts))
        .order_by(Transaction.date.desc())
        .limit(100)
    )
    recent_txns = recent_result.scalars().all()

    # Spending by category
    cat_spending_result = await db.execute(
        select(
            Category.name,
            sql_func.sum(Transaction.amount_cents).label("total_cents"),
            sql_func.count(Transaction.id).label("count"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(Transaction.account_id.in_(user_accounts))
        .group_by(Category.name)
        .order_by(sql_func.sum(Transaction.amount_cents))
    )
    spending_by_category = [
        {"category": row.name, "total_cents": row.total_cents, "count": row.count}
        for row in cat_spending_result
    ]

    # Account balances
    accounts_result = await db.execute(
        select(Account).where(Account.user_id == user_id)
    )
    accounts = accounts_result.scalars().all()
    account_balances = [
        {
            "name": a.name,
            "type": a.account_type.value,
            "balance_cents": a.balance_cents,
        }
        for a in accounts
    ]

    context: dict[str, Any] = {
        "recent_transactions": [
            {
                "date": str(t.date),
                "description": t.description,
                "merchant_name": t.merchant_name,
                "amount_cents": t.amount_cents,
                "category": t.category.name if t.category else "Uncategorized",
            }
            for t in recent_txns
        ],
        "spending_by_category": spending_by_category,
        "account_balances": account_balances,
    }

    answer = await provider.query(question, context)

    return {"answer": answer, "data": None}
