from __future__ import annotations

import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.institution import Institution


async def _create_institution(db: AsyncSession) -> uuid.UUID:
    inst = Institution(name="TestBank")
    db.add(inst)
    await db.flush()
    return inst.id


async def test_list_accounts_empty(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["data"] == []
    assert body["total"] == 0


async def test_create_account(
    client: httpx.AsyncClient, auth_token: str, async_db: AsyncSession
):
    inst_id = await _create_institution(async_db)
    await async_db.commit()

    res = await client.post(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "institution_id": str(inst_id),
            "name": "My Checking",
            "account_type": "checking",
        },
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["name"] == "My Checking"
    assert data["account_type"] == "checking"


async def test_get_account(
    client: httpx.AsyncClient, auth_token: str, async_db: AsyncSession
):
    inst_id = await _create_institution(async_db)
    await async_db.commit()

    create_res = await client.post(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "institution_id": str(inst_id),
            "name": "Savings",
            "account_type": "savings",
        },
    )
    account_id = create_res.json()["data"]["id"]

    res = await client.get(
        f"/api/v1/accounts/{account_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Savings"


async def test_get_account_not_found(client: httpx.AsyncClient, auth_token: str):
    fake_id = str(uuid.uuid4())
    res = await client.get(
        f"/api/v1/accounts/{fake_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 404


async def test_update_account(
    client: httpx.AsyncClient, auth_token: str, async_db: AsyncSession
):
    inst_id = await _create_institution(async_db)
    await async_db.commit()

    create_res = await client.post(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "institution_id": str(inst_id),
            "name": "Old Name",
            "account_type": "checking",
        },
    )
    account_id = create_res.json()["data"]["id"]

    res = await client.patch(
        f"/api/v1/accounts/{account_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "New Name"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "New Name"


async def test_delete_account(
    client: httpx.AsyncClient, auth_token: str, async_db: AsyncSession
):
    inst_id = await _create_institution(async_db)
    await async_db.commit()

    create_res = await client.post(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "institution_id": str(inst_id),
            "name": "Delete Me",
            "account_type": "checking",
        },
    )
    account_id = create_res.json()["data"]["id"]

    res = await client.delete(
        f"/api/v1/accounts/{account_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 204


async def test_accounts_unauthorized(client: httpx.AsyncClient):
    res = await client.get("/api/v1/accounts")
    assert res.status_code == 401
