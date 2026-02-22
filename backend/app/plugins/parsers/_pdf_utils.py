from __future__ import annotations

import io
import logging
import re

import pdfplumber

logger = logging.getLogger(__name__)

# Simple per-call cache: keyed by id(file_content) to avoid re-extracting
# text from the same bytes object during a single import cycle.
_text_cache: dict[int, str] = {}


def extract_text(file_content: bytes) -> str:
    """Extract all text from a PDF. Results are cached by object identity."""
    key = id(file_content)
    if key in _text_cache:
        return _text_cache[key]

    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception:
        logger.exception("Failed to extract text from PDF")

    _text_cache[key] = text
    return text


def clear_text_cache() -> None:
    """Clear the extraction cache (call after import cycle completes)."""
    _text_cache.clear()


def strip_code_fences(text: str) -> str:
    """Remove markdown code fences from LLM responses."""
    text = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
    text = re.sub(r"\n?```\s*$", "", text.strip())
    return text
