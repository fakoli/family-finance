from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.institution import Institution
from app.models.transaction import Transaction
from app.models.user import User
from app.plugins import registry
from app.plugins.parsers.rocket_money import register_plugin
from app.services.auth_service import hash_password
from app.services.import_service import (
    _get_or_create_category,
    _get_or_create_institution,
    _is_duplicate,
    run_import,
)


async def _create_test_user(db: AsyncSession) -> User:
    user = User(
        username="importtester",
        email="import@test.com",
        hashed_password=hash_password("pass"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def test_get_or_create_institution_creates(async_db: AsyncSession):
    inst = await _get_or_create_institution(async_db, "TestBank")
    assert inst.name == "TestBank"
    assert inst.id is not None

    # Second call returns same instance
    inst2 = await _get_or_create_institution(async_db, "TestBank")
    assert inst2.id == inst.id


async def test_get_or_create_category_creates(async_db: AsyncSession):
    cat = await _get_or_create_category(async_db, "Groceries")
    assert cat.name == "Groceries"
    assert cat.is_system is True

    cat2 = await _get_or_create_category(async_db, "Groceries")
    assert cat2.id == cat.id


async def test_is_duplicate_no_match(async_db: AsyncSession):
    result = await _is_duplicate(
        async_db, uuid.uuid4(), date(2024, 1, 1), 1000, "TEST"
    )
    assert result is False


async def test_is_duplicate_finds_match(async_db: AsyncSession):
    user = await _create_test_user(async_db)
    inst = await _get_or_create_institution(async_db, "Bank")
    cat = await _get_or_create_category(async_db, "Test")

    account = Account(
        user_id=user.id,
        institution_id=inst.id,
        name="Checking",
        account_type="checking",
    )
    async_db.add(account)
    await async_db.flush()

    txn = Transaction(
        account_id=account.id,
        date=date(2024, 1, 15),
        amount_cents=450,
        description="STARBUCKS #1234",
        category_id=cat.id,
    )
    async_db.add(txn)
    await async_db.commit()

    result = await _is_duplicate(
        async_db, account.id, date(2024, 1, 15), 450, "STARBUCKS #1234"
    )
    assert result is True


async def test_run_import_full(async_db: AsyncSession, sample_csv: bytes):
    # Ensure parser is registered
    register_plugin()

    user = await _create_test_user(async_db)
    job = await run_import(async_db, user.id, "test.csv", sample_csv)

    assert job.status.value == "completed"
    assert job.total_rows == 8
    assert job.imported_rows == 8
    assert job.duplicate_rows == 0

    # Verify transactions were created
    result = await async_db.execute(select(Transaction))
    txns = result.scalars().all()
    assert len(txns) == 8


async def test_run_import_detects_duplicates(async_db: AsyncSession, sample_csv: bytes):
    register_plugin()

    user = await _create_test_user(async_db)

    # First import
    job1 = await run_import(async_db, user.id, "test.csv", sample_csv)
    assert job1.imported_rows == 8

    # Second import of same data
    job2 = await run_import(async_db, user.id, "test.csv", sample_csv)
    assert job2.imported_rows == 0
    assert job2.duplicate_rows == 8


async def test_run_import_no_parser(async_db: AsyncSession):
    # Clear registry to ensure no parser matches
    for sub_dict in registry._registry.values():
        sub_dict.clear()

    user = await _create_test_user(async_db)
    job = await run_import(async_db, user.id, "data.xlsx", b"not a csv")

    assert job.status.value == "failed"
    assert "No parser found" in (job.error_message or "")
