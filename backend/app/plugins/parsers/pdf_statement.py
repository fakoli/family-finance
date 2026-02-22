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

BROKERAGE_KEYWORDS = [
    "Holdings",
    "Portfolio Value",
    "Securities",
    "Market Value",
]

TAX_KEYWORDS = [
    "W-2",
    "1099",
    "1098",
    "Wage and Tax Statement",
    "Form 1099",
]

INSTITUTION_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"Ally\s*Bank|ally\.com", re.IGNORECASE), "Ally Bank"),
    (
        re.compile(r"JPMorgan\s*Chase|chase\.com|Chase\s*Bank", re.IGNORECASE),
        "Chase",
    ),
    (
        re.compile(r"Bank\s*of\s*America|bankofamerica\.com", re.IGNORECASE),
        "Bank of America",
    ),
    (re.compile(r"PennyMac|pennymacusa\.com", re.IGNORECASE), "PennyMac"),
    (
        re.compile(r"American\s*Express|amex\.com", re.IGNORECASE),
        "American Express",
    ),
]

ACCOUNT_LAST4_PATTERN = re.compile(
    r"(?:Account\s+(?:ending\s+in|Number[:\s]*\.{0,3})\s*)(\d{4})",
    re.IGNORECASE,
)

MODEL = "claude-sonnet-4-5-20250929"



class PDFStatementParser(FileParserPlugin):
    name = "pdf_statement"
    supported_extensions = [".pdf"]

    def detect(self, file_content: bytes, filename: str) -> bool:
        if not filename.lower().endswith(".pdf"):
            return False
        try:
            text = extract_text(file_content)
            if not text:
                return False

            # Reject if brokerage or tax keywords found
            for kw in BROKERAGE_KEYWORDS:
                if kw.lower() in text.lower():
                    return False
            for kw in TAX_KEYWORDS:
                if kw.lower() in text.lower():
                    return False

            # Accept if any bank statement keyword found
            text_lower = text.lower()
            return any(kw.lower() in text_lower for kw in BANK_STATEMENT_KEYWORDS)
        except Exception:
            logger.exception("PDFStatementParser.detect failed")
            return False

    def _detect_institution(self, text: str) -> str:
        for pattern, name in INSTITUTION_PATTERNS:
            if pattern.search(text):
                return name
        return "Unknown"

    def _detect_account_type(self, text: str, institution: str) -> str:
        if institution == "PennyMac":
            return "mortgage"
        text_lower = text.lower()
        if "credit card" in text_lower or "card account" in text_lower:
            return "credit_card"
        return "checking"

    def _detect_account_last4(self, text: str) -> str:
        match = ACCOUNT_LAST4_PATTERN.search(text)
        return match.group(1) if match else ""

    async def parse(self, file_content: bytes, filename: str) -> list[dict[str, Any]]:
        text = extract_text(file_content)
        if not text:
            logger.warning("No text extracted from PDF: %s", filename)
            return []

        institution = self._detect_institution(text)
        account_type = self._detect_account_type(text, institution)
        account_last4 = self._detect_account_last4(text)

        prompt = (
            f"You are extracting transactions from a {institution} {account_type} statement.\n\n"
            f"Extract ALL individual transactions from this statement. "
            f"For each transaction return:\n"
            f"- date: YYYY-MM-DD format\n"
            f"- description: the transaction description exactly as shown\n"
            f"- amount_cents: integer amount in cents "
            f"(positive for debits/charges, negative for credits/payments/deposits)\n"
            f"- merchant_name: cleaned merchant name if identifiable, "
            f"otherwise same as description\n\n"
            f"Return a JSON array. Output ONLY valid JSON, no other text.\n\n"
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
            transactions: list[dict[str, Any]] = json.loads(raw)
        except Exception:
            logger.exception("Claude API call failed for PDF statement: %s", filename)
            return []

        results: list[dict[str, Any]] = []
        for txn in transactions:
            results.append(
                {
                    "date": txn.get("date", ""),
                    "description": txn.get("description", ""),
                    "original_description": txn.get("description", ""),
                    "amount_cents": int(txn.get("amount_cents", 0)),
                    "merchant_name": txn.get("merchant_name"),
                    "institution_name": institution,
                    "account_name": institution,
                    "account_type": account_type,
                    "account_number_last4": account_last4,
                    "category_name": "Uncategorized",
                    "_use_fuzzy_dedup": True,
                    "_statement_metadata": {
                        "institution": institution,
                        "account_type": account_type,
                        "account_last4": account_last4,
                        "source_file": filename,
                    },
                }
            )

        return results


def register_plugin() -> None:
    registry.register("parser", PDFStatementParser())
