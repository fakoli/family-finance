from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=dict)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(select(Category).order_by(Category.name))
    all_cats = result.scalars().all()

    # Build tree in memory to avoid async lazy-loading issues
    by_id = {c.id: CategoryResponse.model_validate(c).model_dump() for c in all_cats}
    for d in by_id.values():
        d["children"] = []

    roots = []
    for cat in all_cats:
        node = by_id[cat.id]
        if cat.parent_id and cat.parent_id in by_id:
            by_id[cat.parent_id]["children"].append(node)
        else:
            roots.append(node)

    return {"data": roots, "total": len(roots)}


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> dict:
    cat = Category(
        name=body.name,
        parent_id=body.parent_id,
        icon=body.icon,
        color=body.color,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return {"data": CategoryResponse.model_validate(cat)}


@router.patch("/{category_id}", response_model=dict)
async def update_category(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if cat is None:
        raise HTTPException(status_code=404, detail="Category not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)

    await db.commit()
    await db.refresh(cat)
    return {"data": CategoryResponse.model_validate(cat)}
