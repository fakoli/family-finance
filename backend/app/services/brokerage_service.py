from __future__ import annotations

import logging
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.brokerage_holding import BrokerageHolding
from app.models.import_job import ImportJob
from app.services.import_service import (
    _get_or_create_account_sync,
    _get_or_create_institution_sync,
)

logger = logging.getLogger(__name__)


def save_brokerage_holdings(
    db: Session, user_id: uuid.UUID, parsed_data: list[dict], job: ImportJob
) -> None:
    """Save brokerage holdings from parsed PDF data."""
    # parsed_data is a list where the first item has _document_type, institution_name, etc.
    # and has a "holdings" key with the actual holdings list
    first = parsed_data[0] if parsed_data else {}
    holdings_data = first.get("holdings", [])
    institution_name = first.get("institution_name", "Unknown")
    account_name = first.get("account_name", institution_name)
    snapshot_date_str = first.get("snapshot_date", "")

    # Get or create institution and account
    institution = _get_or_create_institution_sync(db, institution_name)
    account = _get_or_create_account_sync(db, institution, account_name, "brokerage", "", user_id)

    snapshot_date = date.fromisoformat(snapshot_date_str) if snapshot_date_str else date.today()

    for h in holdings_data:
        holding = BrokerageHolding(
            user_id=user_id,
            account_id=account.id,
            symbol=h.get("symbol", ""),
            name=h.get("name", ""),
            quantity=Decimal(str(h.get("quantity", 0))),
            cost_basis_cents=h.get("cost_basis_cents"),
            market_value_cents=h.get("market_value_cents", 0),
            unrealized_gain_cents=h.get("unrealized_gain_cents"),
            snapshot_date=snapshot_date,
        )
        db.add(holding)

    job.imported_rows = len(holdings_data)
    job.total_rows = len(holdings_data)
    db.flush()


def get_net_worth_summary(db: Session, user_id: uuid.UUID) -> dict:
    """Get net worth summary for a user."""
    # Get all accounts with balances
    accounts = db.execute(select(Account).where(Account.user_id == user_id)).scalars().all()

    # Get latest holdings per symbol (most recent snapshot)
    latest_holdings = (
        db.execute(
            select(BrokerageHolding)
            .where(BrokerageHolding.user_id == user_id)
            .order_by(BrokerageHolding.snapshot_date.desc())
        )
        .scalars()
        .all()
    )

    # Dedupe to latest per symbol+account
    seen: set[tuple[uuid.UUID, str]] = set()
    unique_holdings: list[BrokerageHolding] = []
    for h in latest_holdings:
        key = (h.account_id, h.symbol)
        if key not in seen:
            seen.add(key)
            unique_holdings.append(h)

    # Calculate totals
    total_assets = 0
    total_liabilities = 0
    breakdown: list[dict] = []

    # Account balances
    for acct in accounts:
        bal = acct.balance_cents or 0
        if acct.account_type.value in ("loan", "mortgage", "credit_card"):
            total_liabilities += abs(bal)
            breakdown.append({"label": acct.name, "amount_cents": -abs(bal), "type": "liability"})
        else:
            total_assets += bal
            breakdown.append({"label": acct.name, "amount_cents": bal, "type": "asset"})

    # Investment holdings
    investment_total = sum(h.market_value_cents for h in unique_holdings)
    total_assets += investment_total
    if unique_holdings:
        breakdown.append(
            {"label": "Investments", "amount_cents": investment_total, "type": "asset"}
        )

    return {
        "total_assets_cents": total_assets,
        "total_liabilities_cents": total_liabilities,
        "net_worth_cents": total_assets - total_liabilities,
        "breakdown": breakdown,
    }


def get_holdings(db: Session, user_id: uuid.UUID) -> list[BrokerageHolding]:
    """Get all current holdings for a user (latest snapshot per symbol)."""
    holdings = (
        db.execute(
            select(BrokerageHolding)
            .where(BrokerageHolding.user_id == user_id)
            .order_by(BrokerageHolding.snapshot_date.desc())
        )
        .scalars()
        .all()
    )

    seen: set[tuple[uuid.UUID, str]] = set()
    result: list[BrokerageHolding] = []
    for h in holdings:
        key = (h.account_id, h.symbol)
        if key not in seen:
            seen.add(key)
            result.append(h)
    return result


def get_net_worth_history(db: Session, user_id: uuid.UUID) -> list[dict]:
    """Get net worth over time from holding snapshots."""
    holdings = (
        db.execute(
            select(BrokerageHolding)
            .where(BrokerageHolding.user_id == user_id)
            .order_by(BrokerageHolding.snapshot_date)
        )
        .scalars()
        .all()
    )

    # Group by snapshot_date
    by_date: dict[date, int] = {}
    for h in holdings:
        by_date.setdefault(h.snapshot_date, 0)
        by_date[h.snapshot_date] += h.market_value_cents

    return [{"date": d.isoformat(), "net_worth_cents": v} for d, v in sorted(by_date.items())]


def get_asset_allocation(db: Session, user_id: uuid.UUID) -> list[dict]:
    """Get asset allocation by account type."""
    accounts = db.execute(select(Account).where(Account.user_id == user_id)).scalars().all()

    holdings = get_holdings(db, user_id)

    allocation: dict[str, int] = {}
    for acct in accounts:
        bal = acct.balance_cents or 0
        if bal > 0:
            cat = acct.account_type.value
            allocation[cat] = allocation.get(cat, 0) + bal

    investment_total = sum(h.market_value_cents for h in holdings)
    if investment_total > 0:
        allocation["investments"] = allocation.get("investments", 0) + investment_total

    total = sum(allocation.values()) or 1
    return [
        {"category": k, "amount_cents": v, "percentage": round(v / total * 100, 1)}
        for k, v in sorted(allocation.items(), key=lambda x: -x[1])
    ]
