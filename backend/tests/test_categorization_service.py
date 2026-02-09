from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account, AccountType
from app.models.category import Category
from app.models.institution import Institution
from app.models.transaction import Transaction
from app.plugins import registry
from app.plugins.base import AIProviderPlugin
from app.services.categorization_service import categorize_batch, categorize_transaction


class MockAIProvider(AIProviderPlugin):
    name = "mock_ai"

    def __init__(self):
        self.categorize = AsyncMock(return_value="Groceries")
        self.categorize_batch = AsyncMock(
            side_effect=lambda txns: [
                {"category": "Groceries", "confidence": 0.9, "merchant_normalized": None}
                for _ in txns
            ]
        )
        self.query = AsyncMock(return_value="Mock answer")
        self.normalize_merchant = AsyncMock(side_effect=lambda n: n)
        self.summarize = AsyncMock(return_value="Mock summary")


async def _setup_data(db: AsyncSession) -> dict:
    """Create institution, account, category, and a transaction for testing."""
    inst = Institution(name="MockBank")
    db.add(inst)
    await db.flush()

    # Create a dummy user for the account
    from app.models.user import User
    from app.services.auth_service import hash_password

    user = User(
        username="catuser",
        email="cat@test.com",
        hashed_password=hash_password("pass"),
    )
    db.add(user)
    await db.flush()

    acct = Account(
        user_id=user.id,
        institution_id=inst.id,
        name="Mock Checking",
        account_type=AccountType.CHECKING,
    )
    db.add(acct)
    await db.flush()

    cat = Category(name="Groceries")
    db.add(cat)
    await db.flush()

    txn = Transaction(
        account_id=acct.id,
        date="2025-01-15",
        amount_cents=5000,
        description="Whole Foods Market",
        merchant_name="Whole Foods",
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    return {"txn_id": txn.id, "category_id": cat.id}


@pytest.fixture(autouse=True)
def _register_mock_provider():
    provider = MockAIProvider()
    registry.register("ai", provider)
    yield
    # Clean up
    registry._registry["ai"].pop("mock_ai", None)


async def test_categorize_single_transaction(async_db: AsyncSession):
    data = await _setup_data(async_db)
    result = await categorize_transaction(async_db, data["txn_id"], provider_name="mock_ai")
    assert result["transaction_id"] == data["txn_id"]
    assert result["category_name"] == "Groceries"


async def test_categorize_batch_transactions(async_db: AsyncSession):
    data = await _setup_data(async_db)

    # Create a second transaction
    from sqlalchemy import select

    result = await async_db.execute(select(Account).limit(1))
    acct = result.scalar_one()
    txn2 = Transaction(
        account_id=acct.id,
        date="2025-01-20",
        amount_cents=3000,
        description="Trader Joe's",
    )
    async_db.add(txn2)
    await async_db.commit()
    await async_db.refresh(txn2)

    results = await categorize_batch(
        async_db, [data["txn_id"], txn2.id], provider_name="mock_ai"
    )
    assert len(results) == 2
    assert all(r["category_name"] == "Groceries" for r in results)


async def test_categorize_empty_batch(async_db: AsyncSession):
    results = await categorize_batch(async_db, [], provider_name="mock_ai")
    assert results == []


async def test_categorize_nonexistent_transaction(async_db: AsyncSession):
    fake_id = uuid.uuid4()
    with pytest.raises(ValueError, match="not found"):
        await categorize_transaction(async_db, fake_id, provider_name="mock_ai")
