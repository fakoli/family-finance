from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import *  # noqa: F401, F403 — ensure all models are loaded
from app.services.auth_service import create_access_token, hash_password

# Test database URL: append _test to the database name
_test_db_url = settings.DATABASE_URL
if "_test" not in _test_db_url:
    _test_db_url = _test_db_url.rsplit("/", 1)[0] + "/familyfinance_test"

@pytest.fixture()
async def async_db() -> AsyncGenerator[AsyncSession]:
    engine = create_async_engine(_test_db_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture()
async def client(async_db: AsyncSession) -> AsyncGenerator[httpx.AsyncClient]:
    async def _override_get_db() -> AsyncGenerator[AsyncSession]:
        yield async_db

    app.dependency_overrides[get_db] = _override_get_db

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture()
async def auth_token(async_db: AsyncSession) -> str:
    from app.models.user import User

    user = User(
        username="testuser",
        email="test@test.com",
        hashed_password=hash_password("testpass"),
    )
    async_db.add(user)
    await async_db.commit()
    await async_db.refresh(user)
    return create_access_token(user.id)


@pytest.fixture()
async def admin_token(async_db: AsyncSession) -> str:
    from app.models.user import User

    user = User(
        username="adminuser",
        email="admin@test.com",
        hashed_password=hash_password("adminpass"),
        is_admin=True,
    )
    async_db.add(user)
    await async_db.commit()
    await async_db.refresh(user)
    return create_access_token(user.id)


@pytest.fixture()
def sample_csv() -> bytes:
    import pathlib

    csv_path = pathlib.Path(__file__).parent / "fixtures" / "sample_rocket_money.csv"
    return csv_path.read_bytes()
