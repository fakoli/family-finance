from __future__ import annotations

import io
import json
import logging
import re
from typing import Any

import anthropic
import pdfplumber

from app.config import settings
from app.plugins import registry
from app.plugins.base import FileParserPlugin

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


def _extract_text(file_content: bytes, max_pages: int | None = None) -> str:
    """Extract text from a PDF using pdfplumber."""
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            pages = pdf.pages[:max_pages] if max_pages else pdf.pages
            return "\n\n".join(page.extract_text() or "" for page in pages)
    except Exception:
        logger.exception("Failed to extract text from PDF")
        return ""


def _strip_code_fences(raw: str) -> str:
    """Strip markdown code fences from Claude API response."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # Remove opening fence
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines)
    return text


class PDFBrokerageParser(FileParserPlugin):
    name = "pdf_brokerage"
    supported_extensions = [".pdf"]

    def detect(self, file_content: bytes, filename: str) -> bool:
        if not filename.lower().endswith(".pdf"):
            return False
        try:
            text = _extract_text(file_content, max_pages=2)
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
        text = _extract_text(file_content)
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
            raw = _strip_code_fences(raw)
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
