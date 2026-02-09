from __future__ import annotations

import httpx

from app.plugins.parsers.rocket_money import register_plugin


async def test_upload_csv(client: httpx.AsyncClient, auth_token: str, sample_csv: bytes):
    register_plugin()

    res = await client.post(
        "/api/v1/imports/upload",
        headers={"Authorization": f"Bearer {auth_token}"},
        files={"file": ("transactions.csv", sample_csv, "text/csv")},
    )
    assert res.status_code == 202
    data = res.json()["data"]
    assert data["filename"] == "transactions.csv"
    assert data["status"] in ("pending", "processing")


async def test_upload_unsupported_file(client: httpx.AsyncClient, auth_token: str):
    register_plugin()

    res = await client.post(
        "/api/v1/imports/upload",
        headers={"Authorization": f"Bearer {auth_token}"},
        files={"file": ("data.xlsx", b"not a csv", "application/octet-stream")},
    )
    assert res.status_code == 400
    assert "No parser found" in res.json()["detail"]


async def test_upload_empty_file(client: httpx.AsyncClient, auth_token: str):
    res = await client.post(
        "/api/v1/imports/upload",
        headers={"Authorization": f"Bearer {auth_token}"},
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert res.status_code == 400


async def test_import_history(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/imports/history",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert "total" in body


async def test_import_history_unauthorized(client: httpx.AsyncClient):
    res = await client.get("/api/v1/imports/history")
    assert res.status_code == 401


async def test_get_nonexistent_job(client: httpx.AsyncClient, auth_token: str):
    import uuid

    fake_id = str(uuid.uuid4())
    res = await client.get(
        f"/api/v1/imports/{fake_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 404
