from __future__ import annotations

import httpx


async def test_summary_empty(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/dashboard/summary",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["income_cents"] == 0
    assert data["expense_cents"] == 0
    assert data["net_cents"] == 0
    assert data["transaction_count"] == 0
    assert data["spending_by_category"] == []
    assert data["account_balances"] == []


async def test_summary_with_dates(client: httpx.AsyncClient, auth_token: str):
    res = await client.get(
        "/api/v1/dashboard/summary",
        headers={"Authorization": f"Bearer {auth_token}"},
        params={"date_from": "2025-01-01", "date_to": "2025-12-31"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "income_cents" in data
    assert "expense_cents" in data


async def test_summary_unauthorized(client: httpx.AsyncClient):
    res = await client.get("/api/v1/dashboard/summary")
    assert res.status_code == 401
