from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.auth_service import (
    create_access_token,
    decode_access_token,
    hash_password,
    register_user,
    verify_password,
)


def test_hash_and_verify_password():
    hashed = hash_password("mysecret")
    assert hashed != "mysecret"
    assert verify_password("mysecret", hashed)
    assert not verify_password("wrong", hashed)


def test_create_and_decode_token():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    decoded = decode_access_token(token)
    assert decoded == user_id


def test_decode_invalid_token():
    assert decode_access_token("not-a-token") is None
    assert decode_access_token("") is None


async def test_register_user(async_db: AsyncSession):
    user = await register_user(async_db, "alice", "alice@example.com", "pass123")
    assert user.username == "alice"
    assert user.email == "alice@example.com"
    assert user.is_active is True
    assert user.id is not None


async def test_register_duplicate_user(async_db: AsyncSession):
    await register_user(async_db, "bob", "bob@example.com", "pass123")
    with pytest.raises(Exception):
        await register_user(async_db, "bob", "bob2@example.com", "pass123")
