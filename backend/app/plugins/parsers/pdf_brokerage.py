from __future__ import annotations

import json
import logging
import re
from typing import Any

import anthropic

from app.config import settings
from app.plugins import registry
from app.plugins.base import FileParserPlugin
from app.plugins.parsers._pdf_utils import extract_text, strip_code_fences

logger = logging.getLogger(__name__)

BROKERAGE_KEYWORDS = [
    "Holdings",
    "Portfolio Value",
    "Market Value",
    "Shares",
    "Securities",
    "Investment Summary",
    "Account Holdings",
    "Stock Plan",
]

BANK_STATEMENT_KEYWORDS = [
    "Statement Period",
    "Account Summary",
    "Transaction Activity",
    "Closing Balance",
    "Previous Balance",
    "Payments and Credits",
    "New Balance",
    "Minimum Payment",
    "Billing Period",
    "Payment Due Date",
    "Account Activity",
]

INSTITUTION_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"Charles\s*Schwab|Schwab", re.IGNORECASE), "Schwab"),
    (re.compile(r"Fidelity", re.IGNORECASE), "Fidelity"),
]

MODEL = "claude-sonnet-4-5-20250929"


class PDFBrokerageParser(FileParserPlugin):
    name = "pdf_brokerage"
    supported_extensions = [".pdf"]

    def detect(self, file_content: bytes, filename: str) -> bool:
        if not filename.lower().endswith(".pdf"):
            return False
        try:
            text = extract_text(file_content)
            if not text:
                return False

            text_lower = text.lower()

            # Reject if bank statement keywords dominate
            bank_count = sum(1 for kw in BANK_STATEMENT_KEYWORDS if kw.lower() in text_lower)
            brokerage_count = sum(1 for kw in BROKERAGE_KEYWORDS if kw.lower() in text_lower)
            if bank_count > 0 and brokerage_count == 0:
                return False

            return any(kw.lower() in text_lower for kw in BROKERAGE_KEYWORDS)
        except Exception:
            logger.exception("PDFBrokerageParser.detect failed")
            return False

    def _detect_institution(self, text: str) -> str:
        for pattern, name in INSTITUTION_PATTERNS:
            if pattern.search(text):
                return name
        return "Unknown"

    async def parse(self, file_content: bytes, filename: str) -> list[dict[str, Any]]:
        text = extract_text(file_content)
        if not text:
            logger.warning("No text extracted from PDF: %s", filename)
            return []

        institution = self._detect_institution(text)

        prompt = (
            f"You are extracting investment holdings from a {institution} "
            f"brokerage statement.\n\n"
            f"For each security/holding position, extract:\n"
            f"- symbol: ticker symbol (e.g., PINS, FXAIX, VTI)\n"
            f"- name: full security name\n"
            f"- quantity: number of shares (decimal)\n"
            f"- cost_basis_cents: total cost basis in cents (if shown, otherwise null)\n"
            f"- market_value_cents: current market value in cents\n"
            f"- unrealized_gain_cents: unrealized gain/loss in cents "
            f"(if shown, otherwise null)\n\n"
            f"Also extract:\n"
            f"- account_name: the account name/type from the statement\n"
            f"- snapshot_date: the statement date in YYYY-MM-DD format\n\n"
            f'Return JSON: {{ "account_name": "...", "snapshot_date": "...", '
            f'"holdings": [...] }}\n'
            f"Output ONLY valid JSON.\n\n"
            f"Statement text:\n{text}"
        )

        try:
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            message = await client.messages.create(
                model=MODEL,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            raw = strip_code_fences(raw)
            data: dict[str, Any] = json.loads(raw)
        except Exception:
            logger.exception("Claude API call failed for brokerage PDF: %s", filename)
            return []

        account_name = data.get("account_name", institution)
        snapshot_date = data.get("snapshot_date", "")
        holdings = data.get("holdings", [])

        results: list[dict[str, Any]] = []
        for holding in holdings:
            results.append(
                {
                    "symbol": holding.get("symbol", ""),
                    "name": holding.get("name", ""),
                    "quantity": holding.get("quantity", 0),
                    "cost_basis_cents": holding.get("cost_basis_cents"),
                    "market_value_cents": int(holding.get("market_value_cents", 0)),
                    "unrealized_gain_cents": holding.get("unrealized_gain_cents"),
                    "account_name": account_name,
                    "snapshot_date": snapshot_date,
                    "institution_name": institution,
                    "_document_type": "brokerage_statement",
                    "_statement_metadata": {
                        "institution": institution,
                        "account_name": account_name,
                        "snapshot_date": snapshot_date,
                        "source_file": filename,
                    },
                }
            )

        return results


def register_plugin() -> None:
    registry.register("parser", PDFBrokerageParser())
