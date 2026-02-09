from __future__ import annotations

import io
from typing import Any

import pandas as pd

from app.plugins import registry
from app.plugins.base import FileParserPlugin

EXPECTED_COLUMNS = [
    "Date",
    "Original Date",
    "Account Type",
    "Account Name",
    "Account Number",
    "Institution Name",
    "Name",
    "Custom Name",
    "Amount",
    "Description",
    "Category",
    "Note",
    "Ignored From",
    "Tax Deductible",
    "Transaction Tags",
]

ACCOUNT_TYPE_MAP = {
    "Cash": "checking",
    "Credit Card": "credit_card",
    "Savings": "savings",
    "Brokerage": "brokerage",
    "Retirement": "retirement",
    "Loan": "loan",
}

TRANSFER_CATEGORIES = {
    "Credit Card Payment",
    "Internal Transfers",
    "Savings Transfer",
}


class RocketMoneyParser(FileParserPlugin):
    name = "rocket_money"
    supported_extensions = [".csv"]

    def detect(self, file_content: bytes, filename: str) -> bool:
        if not filename.lower().endswith(".csv"):
            return False
        try:
            header_line = file_content.split(b"\n", 1)[0].decode("utf-8").strip()
            header_fields = [f.strip() for f in header_line.split(",")]
            return header_fields[:6] == EXPECTED_COLUMNS[:6]
        except Exception:
            return False

    async def parse(self, file_content: bytes, filename: str) -> list[dict[str, Any]]:
        df = pd.read_csv(
            io.BytesIO(file_content),
            dtype=str,
            keep_default_na=False,
        )

        # Normalise column names — handle any extra whitespace
        df.columns = [c.strip() for c in df.columns]

        results: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            amount_str = str(row.get("Amount", "0")).strip()
            try:
                amount_cents = round(float(amount_str) * 100)
            except ValueError:
                amount_cents = 0

            category = str(row.get("Category", "")).strip()
            tags_raw = str(row.get("Transaction Tags", "")).strip()
            tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else []

            note = str(row.get("Note", "")).strip() or None
            tax_deductible_str = str(row.get("Tax Deductible", "")).strip().lower()
            is_tax_deductible = tax_deductible_str in ("true", "yes", "1")

            acct_type_raw = str(row.get("Account Type", "")).strip()
            account_type = ACCOUNT_TYPE_MAP.get(acct_type_raw, "checking")

            is_transfer = category in TRANSFER_CATEGORIES

            results.append(
                {
                    "date": str(row.get("Date", "")).strip(),
                    "original_date": str(row.get("Original Date", "")).strip() or None,
                    "account_type": account_type,
                    "account_name": str(row.get("Account Name", "")).strip(),
                    "account_number_last4": str(row.get("Account Number", "")).strip() or None,
                    "institution_name": str(row.get("Institution Name", "")).strip(),
                    "merchant_name": str(row.get("Name", "")).strip() or None,
                    "custom_name": str(row.get("Custom Name", "")).strip() or None,
                    "amount_cents": amount_cents,
                    "description": str(row.get("Description", "")).strip(),
                    "original_description": str(row.get("Description", "")).strip(),
                    "category_name": category,
                    "note": note,
                    "is_transfer": is_transfer,
                    "is_tax_deductible": is_tax_deductible,
                    "tags": tags if tags else None,
                }
            )

        return results


def register_plugin() -> None:
    registry.register("parser", RocketMoneyParser())
