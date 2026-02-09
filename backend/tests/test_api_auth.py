from __future__ import annotations

import httpx


async def test_register_success(client: httpx.AsyncClient):
    res = await client.post(
        "/api/v1/auth/register",
        json={"username": "newuser", "email": "new@test.com", "password": "pass123"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "newuser"
    assert data["email"] == "new@test.com"


async def test_register_duplicate_username(client: httpx.AsyncClient):
    payload = {"username": "dupuser", "email": "dup@test.com", "password": "pass123"}
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post(
        "/api/v1/auth/register",
        json={"username": "dupuser", "email": "dup2@test.com", "password": "pass123"},
    )
    assert res2.status_code == 400


async def test_login_success(client: httpx.AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "loginuser", "email": "login@test.com", "password": "secret"},
    )
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "loginuser", "password": "secret"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password(client: httpx.AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "wrongpw", "email": "wrongpw@test.com", "password": "correct"},
    )
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "wrongpw", "password": "incorrect"},
    )
    assert res.status_code == 401


async def test_login_nonexistent_user(client: httpx.AsyncClient):
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "ghost", "password": "nope"},
    )
    assert res.status_code == 401


async def test_me_authenticated(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@test.com"


async def test_me_unauthenticated(client: httpx.AsyncClient):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
