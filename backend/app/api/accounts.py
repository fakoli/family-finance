from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func as sql_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.account import Account, AccountType
from app.models.user import User
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=dict)
async def list_accounts(
    page: int = 1,
    per_page: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    offset = (page - 1) * per_page
    stmt = select(Account).where(Account.user_id == current_user.id).offset(offset).limit(per_page)
    result = await db.execute(stmt)
    accounts = result.scalars().all()

    count_result = await db.execute(
        select(sql_func.count()).select_from(Account).where(Account.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    return {
        "data": [AccountResponse.model_validate(a) for a in accounts],
        "total": total,
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_account(
    body: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        acct_type = AccountType(body.account_type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid account type: {body.account_type}")

    account = Account(
        user_id=current_user.id,
        institution_id=body.institution_id,
        name=body.name,
        account_type=acct_type,
        account_number_last4=body.account_number_last4,
        is_shared=body.is_shared,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return {"data": AccountResponse.model_validate(account)}


@router.get("/{account_id}", response_model=dict)
async def get_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"data": AccountResponse.model_validate(account)}


@router.patch("/{account_id}", response_model=dict)
async def update_account(
    account_id: uuid.UUID,
    body: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    updates = body.model_dump(exclude_unset=True)
    if "account_type" in updates:
        try:
            updates["account_type"] = AccountType(updates["account_type"])
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid account type")

    for field, value in updates.items():
        setattr(account, field, value)

    await db.commit()
    await db.refresh(account)
    return {"data": AccountResponse.model_validate(account)}


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
    await db.commit()
