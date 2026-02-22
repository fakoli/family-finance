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

TAX_FORM_KEYWORDS = [
    "W-2",
    "1099",
    "1098",
    "Wage and Tax Statement",
    "Form 1099",
    "Interest Income",
    "Dividends and Distributions",
    "1099-G",
]

FORM_TYPE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"Wage\s+and\s+Tax\s+Statement|W-2", re.IGNORECASE), "W-2"),
    (re.compile(r"1099-INT|Interest\s+Income", re.IGNORECASE), "1099-INT"),
    (
        re.compile(r"1099-DIV|Dividends\s+and\s+Distributions", re.IGNORECASE),
        "1099-DIV",
    ),
    (re.compile(r"1099-B|Proceeds\s+From\s+Broker", re.IGNORECASE), "1099-B"),
    (re.compile(r"1099-G", re.IGNORECASE), "1099-G"),
    (re.compile(r"1098|Mortgage\s+Interest", re.IGNORECASE), "1098"),
    (re.compile(r"1099\s+Composite", re.IGNORECASE), "1099-COMPOSITE"),
]

MODEL = "claude-sonnet-4-5-20250929"



def _detect_form_type(text: str) -> str:
    """Detect the tax form type from extracted text."""
    for pattern, form_type in FORM_TYPE_PATTERNS:
        if pattern.search(text):
            return form_type
    return "Unknown"


FORM_EXTRACTION_INSTRUCTIONS = {
    "W-2": (
        "For W-2: employer_name, wages_tips (Box 1), federal_tax_withheld (Box 2), "
        "social_security_wages (Box 3), social_security_tax (Box 4), "
        "medicare_wages (Box 5), medicare_tax (Box 6), state, state_wages, "
        "state_tax_withheld"
    ),
    "1099-INT": (
        "For 1099-INT: payer_name, interest_income, early_withdrawal_penalty, federal_tax_withheld"
    ),
    "1099-DIV": (
        "For 1099-DIV: payer_name, ordinary_dividends, qualified_dividends, "
        "total_capital_gain, federal_tax_withheld"
    ),
    "1099-B": (
        "For 1099-B: broker_name, total_proceeds, total_cost_basis, "
        "total_gain_loss (short_term and long_term if available)"
    ),
    "1099-G": (
        "For 1099-G: payer_name, unemployment_compensation, state_tax_refund, federal_tax_withheld"
    ),
    "1098": ("For 1098: lender_name, mortgage_interest, outstanding_principal, property_tax"),
    "1099-COMPOSITE": (
        "For 1099-COMPOSITE: broker_name, and all sub-sections "
        "(interest, dividends, proceeds) as nested objects"
    ),
}


class PDFTaxFormParser(FileParserPlugin):
    name = "pdf_tax"
    supported_extensions = [".pdf"]

    def detect(self, file_content: bytes, filename: str) -> bool:
        if not filename.lower().endswith(".pdf"):
            return False
        try:
            text = extract_text(file_content)
            if not text:
                return False

            text_lower = text.lower()
            return any(kw.lower() in text_lower for kw in TAX_FORM_KEYWORDS)
        except Exception:
            logger.exception("PDFTaxFormParser.detect failed")
            return False

    async def parse(self, file_content: bytes, filename: str) -> list[dict[str, Any]]:
        text = extract_text(file_content)
        if not text:
            logger.warning("No text extracted from PDF: %s", filename)
            return []

        form_type = _detect_form_type(text)

        # Build the extraction instructions for this form type
        extraction_detail = FORM_EXTRACTION_INSTRUCTIONS.get(form_type, "")
        if not extraction_detail:
            extraction_detail = (
                "Extract the most important fields you can identify from this tax form."
            )

        prompt = (
            f"You are extracting key data from a tax form ({form_type}).\n\n"
            f"Extract the most important fields for this form type:\n\n"
            f"{extraction_detail}\n\n"
            f"All monetary values should be in cents (multiply dollar amounts by 100).\n\n"
            f"Also extract: issuer (employer/payer/lender name), tax_year\n\n"
            f'Return JSON: {{ "form_type": "...", "tax_year": ..., '
            f'"issuer": "...", "extracted_data": {{ ... }} }}\n'
            f"Output ONLY valid JSON.\n\n"
            f"Document text:\n{text}"
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
            logger.exception("Claude API call failed for tax PDF: %s", filename)
            return []

        return [
            {
                "form_type": data.get("form_type", form_type),
                "tax_year": data.get("tax_year"),
                "issuer": data.get("issuer", ""),
                "extracted_data": data.get("extracted_data", {}),
                "_document_type": "tax_form",
                "_statement_metadata": {
                    "form_type": data.get("form_type", form_type),
                    "tax_year": data.get("tax_year"),
                    "issuer": data.get("issuer", ""),
                    "source_file": filename,
                },
            }
        ]


def register_plugin() -> None:
    registry.register("parser", PDFTaxFormParser())
