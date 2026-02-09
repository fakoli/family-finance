from __future__ import annotations

from datetime import date

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account, AccountType
from app.models.category import Category
from app.models.institution import Institution
from app.models.transaction import Transaction


async def _seed_user_and_transactions(
    db: AsyncSession,
    user_id,
) -> dict:
    """Create institution, account, category, and sample transactions for a user."""
    inst = Institution(name="TransBank")
    db.add(inst)
    await db.flush()

    acct = Account(
        user_id=user_id,
        institution_id=inst.id,
        name="Test Checking",
        account_type=AccountType.CHECKING,
    )
    db.add(acct)
    await db.flush()

    cat = Category(name="Groceries")
    db.add(cat)
    await db.flush()

    txn1 = Transaction(
        account_id=acct.id,
        date=date(2025, 1, 15),
        amount_cents=5000,
        description="Whole Foods Market",
        merchant_name="Whole Foods",
        category_id=cat.id,
    )
    txn2 = Transaction(
        account_id=acct.id,
        date=date(2025, 2, 10),
        amount_cents=3000,
        description="Trader Joe's",
        merchant_name="Trader Joe's",
        category_id=cat.id,
    )
    txn3 = Transaction(
        account_id=acct.id,
        date=date(2025, 3, 5),
        amount_cents=7500,
        description="Amazon purchase",
        merchant_name="Amazon",
    )
    db.add_all([txn1, txn2, txn3])
    await db.commit()

    return {"account_id": str(acct.id), "category_id": str(cat.id)}


async def _get_user_id(db: AsyncSession) -> str:
    """Get the test user's ID from the DB (created by auth_token fixture)."""
    from sqlalchemy import select

    from app.models.user import User

    result = await db.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one()
    return user.id


async def test_list_transactions_empty(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/transactions",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["data"] == []
    assert body["total"] == 0


async def test_list_transactions_date_filter(
    client: httpx.AsyncClient, auth_token: str, async_db: AsyncSession
):
    user_id = await _get_user_id(async_db)
    await _seed_user_and_transactions(async_db, user_id)

    res = await client.get(
        "/api/v1/transactions",
        headers={"Authorization": f"Bearer {auth_token}"},
        params={"date_from": "2025-02-01", "date_to": "2025-02-28"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["data"][0]["description"] == "Trader Joe's"


async def test_list_transactions_account_filter(
    client: httpx.AsyncClient, auth_token: str, async_db: AsyncSession
):
    user_id = await _get_user_id(async_db)
    ids = await _seed_user_and_transactions(async_db, user_id)

    res = await client.get(
        "/api/v1/transactions",
        headers={"Authorization": f"Bearer {auth_token}"},
        params={"account_id": ids["account_id"]},
    )
    assert res.status_code == 200
    assert res.json()["total"] == 3


async def test_list_transactions_search(
    client: httpx.AsyncClient, auth_token: str, async_db: AsyncSession
):
    user_id = await _get_user_id(async_db)
    await _seed_user_and_transactions(async_db, user_id)

    res = await client.get(
        "/api/v1/transactions",
        headers={"Authorization": f"Bearer {auth_token}"},
        params={"search": "Amazon"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert "Amazon" in body["data"][0]["description"]


async def test_transactions_unauthorized(client: httpx.AsyncClient):
    res = await client.get("/api/v1/transactions")
    assert res.status_code == 401
