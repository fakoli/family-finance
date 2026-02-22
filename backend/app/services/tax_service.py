from __future__ import annotations

import logging
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.import_job import ImportJob
from app.models.tax_document import TaxDocument
from app.models.transaction import Transaction

logger = logging.getLogger(__name__)


def save_tax_document(
    db: Session, user_id: uuid.UUID, parsed_data: list[dict], job: ImportJob
) -> None:
    """Save tax document data from parsed PDF."""
    first = parsed_data[0] if parsed_data else {}

    # Create statement record first
    from app.services.import_service import create_statement_record

    stmt = create_statement_record(db, user_id, job.filename, parsed_data, job)

    tax_doc = TaxDocument(
        user_id=user_id,
        statement_id=stmt.id,
        form_type=first.get("form_type", "unknown"),
        tax_year=first.get("tax_year", 0),
        issuer=first.get("issuer", "Unknown"),
        extracted_data=first.get("extracted_data", {}),
    )
    db.add(tax_doc)

    job.imported_rows = 1
    job.total_rows = 1
    db.flush()


def get_tax_summary(db: Session, user_id: uuid.UUID, tax_year: int) -> dict:
    """Get tax summary for a year."""
    docs = (
        db.execute(
            select(TaxDocument).where(
                TaxDocument.user_id == user_id,
                TaxDocument.tax_year == tax_year,
            )
        )
        .scalars()
        .all()
    )

    gross_income_cents = 0
    total_tax_cents = 0
    total_deductions_cents = 0

    for doc in docs:
        data = doc.extracted_data or {}
        if doc.form_type == "W-2":
            gross_income_cents += data.get("wages_tips", 0)
            total_tax_cents += data.get("federal_tax_withheld", 0)
            total_tax_cents += data.get("social_security_tax", 0)
            total_tax_cents += data.get("medicare_tax", 0)
            total_tax_cents += data.get("state_tax_withheld", 0)
        elif doc.form_type == "1099-INT":
            gross_income_cents += data.get("interest_income", 0)
        elif doc.form_type == "1099-DIV":
            gross_income_cents += data.get("ordinary_dividends", 0)
        elif doc.form_type in ("1099-B", "1099-COMPOSITE"):
            gain = data.get("total_gain_loss", 0)
            if gain > 0:
                gross_income_cents += gain
        elif doc.form_type == "1098":
            total_deductions_cents += data.get("mortgage_interest", 0)

    effective_rate = (total_tax_cents / gross_income_cents * 100) if gross_income_cents > 0 else 0

    return {
        "gross_income_cents": gross_income_cents,
        "total_tax_cents": total_tax_cents,
        "effective_rate": round(effective_rate, 1),
        "total_deductions_cents": total_deductions_cents,
    }


def get_tax_documents(db: Session, user_id: uuid.UUID, tax_year: int) -> list[TaxDocument]:
    """Get all tax documents for a year."""
    return (
        db.execute(
            select(TaxDocument)
            .where(
                TaxDocument.user_id == user_id,
                TaxDocument.tax_year == tax_year,
            )
            .order_by(TaxDocument.form_type)
        )
        .scalars()
        .all()
    )


def get_income_breakdown(db: Session, user_id: uuid.UUID, tax_year: int) -> list[dict]:
    """Get income breakdown by source for a year."""
    docs = (
        db.execute(
            select(TaxDocument).where(
                TaxDocument.user_id == user_id,
                TaxDocument.tax_year == tax_year,
            )
        )
        .scalars()
        .all()
    )

    items: list[dict] = []
    for doc in docs:
        data = doc.extracted_data or {}
        if doc.form_type == "W-2":
            items.append(
                {
                    "source": "W-2 Wages",
                    "amount_cents": data.get("wages_tips", 0),
                    "description": f"{doc.issuer}",
                }
            )
        elif doc.form_type == "1099-INT":
            items.append(
                {
                    "source": "Interest Income",
                    "amount_cents": data.get("interest_income", 0),
                    "description": f"{doc.issuer}",
                }
            )
        elif doc.form_type == "1099-DIV":
            items.append(
                {
                    "source": "Dividends",
                    "amount_cents": data.get("ordinary_dividends", 0),
                    "description": f"{doc.issuer}",
                }
            )
        elif doc.form_type in ("1099-B", "1099-COMPOSITE"):
            items.append(
                {
                    "source": "Capital Gains",
                    "amount_cents": data.get("total_gain_loss", 0),
                    "description": f"{doc.issuer}",
                }
            )
        elif doc.form_type == "1099-G":
            items.append(
                {
                    "source": "State Tax Refund",
                    "amount_cents": data.get("state_tax_refund", 0),
                    "description": f"{doc.issuer}",
                }
            )

    return sorted(items, key=lambda x: -abs(x["amount_cents"]))


def get_tax_deductible_transactions(
    db: Session, user_id: uuid.UUID, tax_year: int
) -> list[Transaction]:
    """Get tax-deductible transactions for a year."""
    from app.models.account import Account

    start_date = date(tax_year, 1, 1)
    end_date = date(tax_year, 12, 31)

    return (
        db.execute(
            select(Transaction)
            .join(Account)
            .where(
                Account.user_id == user_id,
                Transaction.is_tax_deductible == True,  # noqa: E712
                Transaction.date >= start_date,
                Transaction.date <= end_date,
            )
            .order_by(Transaction.date)
        )
        .scalars()
        .all()
    )
