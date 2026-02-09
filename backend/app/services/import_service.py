from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.account import Account, AccountType
from app.models.category import Category
from app.models.import_job import ImportJob, ImportStatus
from app.models.institution import Institution
from app.models.transaction import Transaction
from app.plugins import registry

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Async helpers (used by the API route)
# ---------------------------------------------------------------------------

async def _get_or_create_institution(db: AsyncSession, name: str) -> Institution:
    result = await db.execute(select(Institution).where(Institution.name == name))
    inst = result.scalar_one_or_none()
    if inst is None:
        inst = Institution(name=name)
        db.add(inst)
        await db.flush()
    return inst


async def _get_or_create_account(
    db: AsyncSession,
    institution: Institution,
    name: str,
    account_type: str,
    last4: str | None,
    user_id: uuid.UUID | None = None,
) -> Account:
    stmt = select(Account).where(
        Account.institution_id == institution.id,
        Account.name == name,
    )
    if last4:
        stmt = stmt.where(Account.account_number_last4 == last4)
    result = await db.execute(stmt)
    account = result.scalar_one_or_none()
    if account is None:
        try:
            acct_type_enum = AccountType(account_type)
        except ValueError:
            acct_type_enum = AccountType.CHECKING
        account = Account(
            user_id=user_id,
            institution_id=institution.id,
            name=name,
            account_type=acct_type_enum,
            account_number_last4=last4,
        )
        db.add(account)
        await db.flush()
    return account


async def _get_or_create_category(db: AsyncSession, name: str) -> Category:
    result = await db.execute(select(Category).where(Category.name == name))
    cat = result.scalar_one_or_none()
    if cat is None:
        cat = Category(name=name, is_system=True)
        db.add(cat)
        await db.flush()
    return cat


async def _is_duplicate(
    db: AsyncSession,
    account_id: uuid.UUID,
    txn_date: date,
    amount_cents: int,
    description: str,
) -> bool:
    result = await db.execute(
        select(Transaction.id).where(
            Transaction.account_id == account_id,
            Transaction.date == txn_date,
            Transaction.amount_cents == amount_cents,
            Transaction.description == description,
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def run_import(
    db: AsyncSession,
    user_id: uuid.UUID,
    filename: str,
    file_content: bytes,
) -> ImportJob:
    # Detect parser
    parsers = registry.get_all("parser")
    parser = None
    for p in parsers.values():
        if p.detect(file_content, filename):
            parser = p
            break

    if parser is None:
        job = ImportJob(
            user_id=user_id,
            filename=filename,
            source_type="unknown",
            status=ImportStatus.FAILED,
            error_message="No parser found for this file format",
        )
        db.add(job)
        await db.commit()
        return job

    job = ImportJob(
        user_id=user_id,
        filename=filename,
        source_type=parser.name,
        status=ImportStatus.PROCESSING,
    )
    db.add(job)
    await db.flush()

    try:
        parsed = await parser.parse(file_content, filename)
        job.total_rows = len(parsed)

        imported = 0
        duplicates = 0

        # Cache lookups
        inst_cache: dict[str, Institution] = {}
        acct_cache: dict[str, Account] = {}
        cat_cache: dict[str, Category] = {}

        for row in parsed:
            # Institution
            inst_name = row["institution_name"]
            if inst_name not in inst_cache:
                inst_cache[inst_name] = await _get_or_create_institution(db, inst_name)
            institution = inst_cache[inst_name]

            # Account
            acct_key = f"{inst_name}|{row['account_name']}|{row.get('account_number_last4', '')}"
            if acct_key not in acct_cache:
                acct_cache[acct_key] = await _get_or_create_account(
                    db,
                    institution,
                    row["account_name"],
                    row["account_type"],
                    row.get("account_number_last4"),
                    user_id,
                )
            account = acct_cache[acct_key]

            # Category
            cat_name = row.get("category_name", "Uncategorized") or "Uncategorized"
            if cat_name not in cat_cache:
                cat_cache[cat_name] = await _get_or_create_category(db, cat_name)
            category = cat_cache[cat_name]

            # Parse date
            txn_date = date.fromisoformat(row["date"])
            original_date = (
                date.fromisoformat(row["original_date"]) if row.get("original_date") else None
            )

            # Deduplicate
            if await _is_duplicate(
                db, account.id, txn_date, row["amount_cents"], row["description"]
            ):
                duplicates += 1
                continue

            txn = Transaction(
                account_id=account.id,
                date=txn_date,
                original_date=original_date,
                amount_cents=row["amount_cents"],
                description=row["description"],
                original_description=row.get("original_description"),
                merchant_name=row.get("merchant_name"),
                category_id=category.id,
                custom_name=row.get("custom_name"),
                note=row.get("note"),
                is_transfer=row.get("is_transfer", False),
                is_tax_deductible=row.get("is_tax_deductible", False),
                tags=row.get("tags"),
                import_job_id=job.id,
            )
            db.add(txn)
            imported += 1

        job.imported_rows = imported
        job.duplicate_rows = duplicates
        job.status = ImportStatus.COMPLETED
        job.completed_at = datetime.now(UTC)
        await db.commit()

    except Exception as exc:
        await db.rollback()
        job.status = ImportStatus.FAILED
        job.error_message = str(exc)[:1000]
        db.add(job)
        await db.commit()

    return job


# ---------------------------------------------------------------------------
# Sync helpers (used by Celery workers)
# ---------------------------------------------------------------------------

def _get_or_create_institution_sync(db: Session, name: str) -> Institution:
    result = db.execute(select(Institution).where(Institution.name == name))
    inst = result.scalar_one_or_none()
    if inst is None:
        inst = Institution(name=name)
        db.add(inst)
        db.flush()
    return inst


def _get_or_create_account_sync(
    db: Session,
    institution: Institution,
    name: str,
    account_type: str,
    last4: str | None,
    user_id: uuid.UUID | None = None,
) -> Account:
    stmt = select(Account).where(
        Account.institution_id == institution.id,
        Account.name == name,
    )
    if last4:
        stmt = stmt.where(Account.account_number_last4 == last4)
    result = db.execute(stmt)
    account = result.scalar_one_or_none()
    if account is None:
        try:
            acct_type_enum = AccountType(account_type)
        except ValueError:
            acct_type_enum = AccountType.CHECKING
        account = Account(
            user_id=user_id,
            institution_id=institution.id,
            name=name,
            account_type=acct_type_enum,
            account_number_last4=last4,
        )
        db.add(account)
        db.flush()
    return account


def _get_or_create_category_sync(db: Session, name: str) -> Category:
    result = db.execute(select(Category).where(Category.name == name))
    cat = result.scalar_one_or_none()
    if cat is None:
        cat = Category(name=name, is_system=True)
        db.add(cat)
        db.flush()
    return cat


def _is_duplicate_sync(
    db: Session,
    account_id: uuid.UUID,
    txn_date: date,
    amount_cents: int,
    description: str,
) -> bool:
    result = db.execute(
        select(Transaction.id).where(
            Transaction.account_id == account_id,
            Transaction.date == txn_date,
            Transaction.amount_cents == amount_cents,
            Transaction.description == description,
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


def run_import_sync(
    db: Session,
    user_id: uuid.UUID,
    filename: str,
    file_content: bytes,
    job_id: uuid.UUID,
    on_progress: Callable[[int], None] | None = None,
) -> ImportJob:
    """Synchronous import for Celery workers. Operates on a pre-created ImportJob."""
    # Detect parser
    parsers = registry.get_all("parser")
    parser = None
    for p in parsers.values():
        if p.detect(file_content, filename):
            parser = p
            break

    job = db.execute(select(ImportJob).where(ImportJob.id == job_id)).scalar_one()

    if parser is None:
        job.status = ImportStatus.FAILED
        job.error_message = "No parser found for this file format"
        db.commit()
        return job

    job.source_type = parser.name
    job.status = ImportStatus.PROCESSING
    db.commit()

    try:
        # parser.parse() is async — run it in a new event loop
        parsed = asyncio.run(parser.parse(file_content, filename))
        job.total_rows = len(parsed)
        db.commit()

        imported = 0
        duplicates = 0

        # Cache lookups
        inst_cache: dict[str, Institution] = {}
        acct_cache: dict[str, Account] = {}
        cat_cache: dict[str, Category] = {}

        for i, row in enumerate(parsed):
            # Institution
            inst_name = row["institution_name"]
            if inst_name not in inst_cache:
                inst_cache[inst_name] = _get_or_create_institution_sync(db, inst_name)
            institution = inst_cache[inst_name]

            # Account
            acct_key = f"{inst_name}|{row['account_name']}|{row.get('account_number_last4', '')}"
            if acct_key not in acct_cache:
                acct_cache[acct_key] = _get_or_create_account_sync(
                    db,
                    institution,
                    row["account_name"],
                    row["account_type"],
                    row.get("account_number_last4"),
                    user_id,
                )
            account = acct_cache[acct_key]

            # Category
            cat_name = row.get("category_name", "Uncategorized") or "Uncategorized"
            if cat_name not in cat_cache:
                cat_cache[cat_name] = _get_or_create_category_sync(db, cat_name)
            category = cat_cache[cat_name]

            # Parse date
            txn_date = date.fromisoformat(row["date"])
            original_date = (
                date.fromisoformat(row["original_date"]) if row.get("original_date") else None
            )

            # Deduplicate
            if _is_duplicate_sync(
                db, account.id, txn_date, row["amount_cents"], row["description"]
            ):
                duplicates += 1
            else:
                txn = Transaction(
                    account_id=account.id,
                    date=txn_date,
                    original_date=original_date,
                    amount_cents=row["amount_cents"],
                    description=row["description"],
                    original_description=row.get("original_description"),
                    merchant_name=row.get("merchant_name"),
                    category_id=category.id,
                    custom_name=row.get("custom_name"),
                    note=row.get("note"),
                    is_transfer=row.get("is_transfer", False),
                    is_tax_deductible=row.get("is_tax_deductible", False),
                    tags=row.get("tags"),
                    import_job_id=job.id,
                )
                db.add(txn)
                imported += 1

            # Progress callback every 100 rows
            if on_progress and (i + 1) % 100 == 0:
                job.processed_rows = i + 1
                db.commit()
                on_progress(i + 1)

        job.processed_rows = len(parsed)
        job.imported_rows = imported
        job.duplicate_rows = duplicates
        db.commit()

    except Exception as exc:
        db.rollback()
        job.status = ImportStatus.FAILED
        job.error_message = str(exc)[:1000]
        db.commit()

    return job
