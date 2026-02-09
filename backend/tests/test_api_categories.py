from __future__ import annotations

import uuid

import httpx


async def test_list_categories_empty(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/categories",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert "total" in body


async def test_create_category(client: httpx.AsyncClient, auth_token: str):
    res = await client.post(
        "/api/v1/categories",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Groceries"},
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["name"] == "Groceries"
    assert data["is_system"] is False


async def test_update_category(client: httpx.AsyncClient, auth_token: str):
    create_res = await client.post(
        "/api/v1/categories",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Old Category"},
    )
    cat_id = create_res.json()["data"]["id"]

    res = await client.patch(
        f"/api/v1/categories/{cat_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Renamed Category"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Renamed Category"


async def test_update_category_not_found(client: httpx.AsyncClient, auth_token: str):
    fake_id = str(uuid.uuid4())
    res = await client.patch(
        f"/api/v1/categories/{fake_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Nope"},
    )
    assert res.status_code == 404


async def test_categories_unauthorized(client: httpx.AsyncClient):
    res = await client.get("/api/v1/categories")
    assert res.status_code == 401
