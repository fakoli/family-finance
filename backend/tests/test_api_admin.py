from __future__ import annotations

import httpx


async def test_list_users_as_admin(client: httpx.AsyncClient, admin_token: str):
    res = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert "total" in body
    assert body["total"] >= 1  # at least the admin user


async def test_list_users_as_non_admin(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 403


async def test_list_users_unauthenticated(client: httpx.AsyncClient):
    res = await client.get("/api/v1/admin/users")
    assert res.status_code == 401


async def test_create_user_as_admin(client: httpx.AsyncClient, admin_token: str):
    res = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "newuser",
            "email": "new@test.com",
            "password": "pass123",
            "is_admin": False,
        },
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["username"] == "newuser"
    assert data["is_admin"] is False


async def test_create_user_non_admin_forbidden(client: httpx.AsyncClient, auth_token: str):
    res = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "username": "hacker",
            "email": "hacker@test.com",
            "password": "pass123",
            "is_admin": True,
        },
    )
    assert res.status_code == 403


async def test_create_duplicate_user(client: httpx.AsyncClient, admin_token: str):
    # The admin user already exists (created by admin_token fixture)
    res = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "adminuser",
            "email": "different@test.com",
            "password": "pass123",
            "is_admin": False,
        },
    )
    assert res.status_code == 400


async def test_update_user_toggle_active(client: httpx.AsyncClient, admin_token: str):
    # First create a user to update
    create_res = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "toggler",
            "email": "toggler@test.com",
            "password": "pass123",
            "is_admin": False,
        },
    )
    user_id = create_res.json()["data"]["id"]

    # Deactivate
    res = await client.patch(
        f"/api/v1/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert res.status_code == 200
    assert res.json()["data"]["is_active"] is False


async def test_update_user_toggle_admin(client: httpx.AsyncClient, admin_token: str):
    create_res = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "promote",
            "email": "promote@test.com",
            "password": "pass123",
            "is_admin": False,
        },
    )
    user_id = create_res.json()["data"]["id"]

    res = await client.patch(
        f"/api/v1/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_admin": True},
    )
    assert res.status_code == 200
    assert res.json()["data"]["is_admin"] is True


async def test_deactivate_user(client: httpx.AsyncClient, admin_token: str):
    create_res = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "deactivate_me",
            "email": "deactivate@test.com",
            "password": "pass123",
            "is_admin": False,
        },
    )
    user_id = create_res.json()["data"]["id"]

    res = await client.delete(
        f"/api/v1/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["is_active"] is False


async def test_system_stats(client: httpx.AsyncClient, admin_token: str):
    res = await client.get(
        "/api/v1/admin/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "total_users" in data
    assert "total_transactions" in data
    assert "total_import_jobs" in data


async def test_system_stats_non_admin(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/admin/stats",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 403


async def test_all_import_jobs(client: httpx.AsyncClient, admin_token: str):
    res = await client.get(
        "/api/v1/admin/import-jobs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert "total" in body
