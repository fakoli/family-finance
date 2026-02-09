from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.plugins import registry
from app.plugins.base import AIProviderPlugin

logger = logging.getLogger(__name__)


def _get_ai_provider(provider_name: str | None = None) -> AIProviderPlugin:
    name = provider_name or settings.DEFAULT_AI_PROVIDER
    provider = registry.get("ai", name)
    if provider is None:
        raise ValueError(
            f"AI provider '{name}' not found. "
            f"Available: {list(registry.get_all('ai').keys())}"
        )
    return provider  # type: ignore[return-value]


async def _match_category(db: AsyncSession, name: str) -> Category | None:
    """Match a category name from the AI to an existing category in the DB."""
    result = await db.execute(select(Category).where(Category.name == name))
    cat = result.scalar_one_or_none()
    if cat is not None:
        return cat
    # Case-insensitive fallback
    result = await db.execute(select(Category))
    all_cats = result.scalars().all()
    lower = name.lower()
    for c in all_cats:
        if c.name.lower() == lower:
            return c
    return None


async def categorize_transaction(
    db: AsyncSession,
    transaction_id: uuid.UUID,
    provider_name: str | None = None,
) -> dict[str, Any]:
    provider = _get_ai_provider(provider_name)

    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise ValueError(f"Transaction {transaction_id} not found")

    desc = txn.description
    if txn.merchant_name:
        desc = f"{txn.merchant_name} - {desc}"

    category_name = await provider.categorize(desc)
    if category_name is None:
        category_name = "Uncategorized"

    category = await _match_category(db, category_name)
    if category is not None:
        txn.category_id = category.id
        await db.commit()
        await db.refresh(txn)

    return {
        "transaction_id": transaction_id,
        "category_name": category.name if category else category_name,
        "confidence": 0.8,
        "merchant_normalized": None,
    }


async def categorize_batch(
    db: AsyncSession,
    transaction_ids: list[uuid.UUID],
    provider_name: str | None = None,
) -> list[dict[str, Any]]:
    provider = _get_ai_provider(provider_name)

    result = await db.execute(
        select(Transaction).where(Transaction.id.in_(transaction_ids))
    )
    transactions = result.scalars().all()

    if not transactions:
        return []

    txn_map = {txn.id: txn for txn in transactions}
    txn_dicts = []
    ordered_ids = []
    for tid in transaction_ids:
        txn = txn_map.get(tid)
        if txn is None:
            continue
        ordered_ids.append(tid)
        txn_dicts.append({
            "description": txn.description,
            "merchant_name": txn.merchant_name,
            "amount_cents": txn.amount_cents,
        })

    ai_results = await provider.categorize_batch(txn_dicts)

    output: list[dict[str, Any]] = []
    for i, tid in enumerate(ordered_ids):
        txn = txn_map[tid]
        ai_result = ai_results[i] if i < len(ai_results) else {
            "category": "Uncategorized", "confidence": 0.0,
            "merchant_normalized": None,
        }

        cat_name = ai_result.get("category", "Uncategorized")
        category = await _match_category(db, cat_name)
        if category is not None:
            txn.category_id = category.id

        merchant_normalized = ai_result.get("merchant_normalized")
        if merchant_normalized and txn.merchant_name:
            txn.merchant_name = merchant_normalized

        output.append({
            "transaction_id": tid,
            "category_name": category.name if category else cat_name,
            "confidence": ai_result.get("confidence", 0.5),
            "merchant_normalized": merchant_normalized,
        })

    await db.commit()
    return output


async def recategorize_uncategorized(
    db: AsyncSession,
    user_id: uuid.UUID,
    provider_name: str | None = None,
) -> dict[str, Any]:
    # Find all transactions with "Uncategorized" category belonging to this user
    uncategorized = await db.execute(
        select(Category).where(Category.name == "Uncategorized")
    )
    uncat = uncategorized.scalar_one_or_none()
    if uncat is None:
        return {"categorized": 0, "total": 0}

    user_accounts = select(Account.id).where(Account.user_id == user_id)
    result = await db.execute(
        select(Transaction).where(
            Transaction.account_id.in_(user_accounts),
            Transaction.category_id == uncat.id,
        )
    )
    txns = result.scalars().all()

    if not txns:
        return {"categorized": 0, "total": 0}

    txn_ids = [txn.id for txn in txns]

    # Process in batches of 20
    batch_size = 20
    categorized = 0
    for start in range(0, len(txn_ids), batch_size):
        batch_ids = txn_ids[start : start + batch_size]
        results = await categorize_batch(db, batch_ids, provider_name)
        for r in results:
            if r["category_name"] != "Uncategorized":
                categorized += 1

    return {"categorized": categorized, "total": len(txn_ids)}
