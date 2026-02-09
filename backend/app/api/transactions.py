from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func as sql_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionListResponse, TransactionResponse, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = 1,
    per_page: int = 50,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    # Base query: transactions belonging to user's accounts
    user_accounts = select(Account.id).where(Account.user_id == current_user.id)
    stmt = select(Transaction).where(Transaction.account_id.in_(user_accounts))
    count_stmt = (
        select(sql_func.count())
        .select_from(Transaction)
        .where(Transaction.account_id.in_(user_accounts))
    )

    if account_id is not None:
        stmt = stmt.where(Transaction.account_id == account_id)
        count_stmt = count_stmt.where(Transaction.account_id == account_id)
    if category_id is not None:
        stmt = stmt.where(Transaction.category_id == category_id)
        count_stmt = count_stmt.where(Transaction.category_id == category_id)
    if date_from is not None:
        stmt = stmt.where(Transaction.date >= date_from)
        count_stmt = count_stmt.where(Transaction.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Transaction.date <= date_to)
        count_stmt = count_stmt.where(Transaction.date <= date_to)
    if search is not None:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Transaction.description.ilike(pattern)
            | Transaction.merchant_name.ilike(pattern)
        )
        count_stmt = count_stmt.where(
            Transaction.description.ilike(pattern)
            | Transaction.merchant_name.ilike(pattern)
        )

    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * per_page
    stmt = stmt.order_by(Transaction.date.desc(), Transaction.created_at.desc())
    stmt = stmt.offset(offset).limit(per_page)
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    return {
        "data": [TransactionResponse.model_validate(t) for t in transactions],
        "total": total,
    }


@router.get("/{transaction_id}", response_model=dict)
async def get_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    user_accounts = select(Account.id).where(Account.user_id == current_user.id)
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.account_id.in_(user_accounts),
        )
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"data": TransactionResponse.model_validate(txn)}


@router.patch("/{transaction_id}", response_model=dict)
async def update_transaction(
    transaction_id: uuid.UUID,
    body: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    user_accounts = select(Account.id).where(Account.user_id == current_user.id)
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.account_id.in_(user_accounts),
        )
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(txn, field, value)

    await db.commit()
    await db.refresh(txn)
    return {"data": TransactionResponse.model_validate(txn)}
