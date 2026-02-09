from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    accounts,
    admin,
    ai,
    auth,
    categories,
    dashboard,
    imports,
    parser_schemas,
    transactions,
)
from app.config import settings
from app.plugins.registry import discover


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    discover()
    yield


app = FastAPI(title="FamilyFinance API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(accounts.router, prefix=api_prefix)
app.include_router(transactions.router, prefix=api_prefix)
app.include_router(imports.router, prefix=api_prefix)
app.include_router(categories.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(ai.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(parser_schemas.router, prefix=api_prefix)


@app.get("/api/v1/health")
async def health() -> dict:
    return {"status": "ok"}
