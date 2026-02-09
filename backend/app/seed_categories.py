"""Seed default categories from Rocket Money category set."""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.database import async_session_factory
from app.models import *  # noqa: F401, F403 — ensure all models are loaded
from app.models.category import Category

DEFAULT_CATEGORIES = [
    "Auto & Transport",
    "Bills & Utilities",
    "Business",
    "Cash & Checks",
    "Charitable Donations",
    "Credit Card Payment",
    "Dining & Drinks",
    "Education",
    "Entertainment & Rec.",
    "Family",
    "Family loan",
    "Fees",
    "Gifts",
    "Groceries",
    "Health & Wellness",
    "Home & Garden",
    "Home Mortgage",
    "Income",
    "Internal Transfers",
    "Investment",
    "Legal",
    "Loan Payment",
    "Medical",
    "Personal Care",
    "Pets",
    "Savings Transfer",
    "Shopping",
    "Software & Tech",
    "Taxes",
    "Travel & Vacation",
    "Uncategorized",
    "Wife",
]


async def seed() -> None:
    async with async_session_factory() as db:
        for name in DEFAULT_CATEGORIES:
            result = await db.execute(select(Category).where(Category.name == name))
            if result.scalar_one_or_none() is None:
                db.add(Category(name=name, is_system=True))
        await db.commit()
        print(f"Seeded {len(DEFAULT_CATEGORIES)} categories")


if __name__ == "__main__":
    asyncio.run(seed())
