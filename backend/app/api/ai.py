from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.ai import (
    CategorizeRequest,
    CategorizeResponse,
    CategorizeResult,
    QueryRequest,
    QueryResponse,
)
from app.services.categorization_service import (
    categorize_batch,
    recategorize_uncategorized,
)
from app.services.ai_query_service import answer_question

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/categorize")
async def categorize_transactions(
    body: CategorizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        results = await categorize_batch(db, body.transaction_ids, body.provider)
        return {
            "data": CategorizeResponse(
                results=[
                    CategorizeResult(
                        transaction_id=r["transaction_id"],
                        category_name=r["category_name"],
                        confidence=r["confidence"],
                        merchant_normalized=r.get("merchant_normalized"),
                    )
                    for r in results
                ]
            )
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Categorization failed: {exc}")


@router.post("/categorize-all")
async def categorize_all_uncategorized(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        result = await recategorize_uncategorized(db, current_user.id)
        return {"data": result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Categorization failed: {exc}")


@router.post("/query")
async def query_finances(
    body: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        result = await answer_question(
            db, current_user.id, body.question, body.provider
        )
        return {"data": QueryResponse(**result)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}")
