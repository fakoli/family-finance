from __future__ import annotations

import json
import logging
from typing import Any

import openai

from app.config import settings
from app.plugins import registry
from app.plugins.base import AIProviderPlugin

logger = logging.getLogger(__name__)

CATEGORIES = [
    "Dining & Drinks", "Software & Tech", "Shopping", "Entertainment & Rec.",
    "Auto & Transport", "Groceries", "Bills & Utilities", "Health & Wellness",
    "Home & Garden", "Income", "Travel & Vacation", "Medical", "Personal Care",
    "Education", "Pets", "Business", "Fees & Charges", "Legal",
    "Gifts & Donations", "Taxes", "Insurance", "Kids", "Cash & ATM",
    "Investments", "Savings Transfer", "Credit Card Payment",
    "Internal Transfers", "Subscriptions", "Uncategorized",
]

CATEGORY_LIST_STR = ", ".join(CATEGORIES)


class OpenAIProvider(AIProviderPlugin):
    name = "openai"

    def _client(self) -> openai.AsyncOpenAI:
        return openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def categorize(self, description: str) -> str | None:
        try:
            client = self._client()
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=100,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Categorize this transaction into exactly one of these "
                            f"categories: {CATEGORY_LIST_STR}\n\n"
                            f"Transaction: {description}\n\n"
                            f"Reply with ONLY the category name, nothing else."
                        ),
                    }
                ],
            )
            result = response.choices[0].message.content.strip()
            if result in CATEGORIES:
                return result
            lower = result.lower()
            for cat in CATEGORIES:
                if cat.lower() == lower:
                    return cat
            return result
        except Exception:
            logger.exception("OpenAI categorize failed")
            return None

    async def categorize_batch(
        self, transactions: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        try:
            client = self._client()
            txn_lines = []
            for i, txn in enumerate(transactions):
                desc = txn.get("description", "")
                merchant = txn.get("merchant_name", "") or ""
                amount = txn.get("amount_cents", 0)
                txn_lines.append(
                    f"{i}. description=\"{desc}\" merchant=\"{merchant}\" "
                    f"amount_cents={amount}"
                )
            txn_block = "\n".join(txn_lines)

            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Categorize each transaction into exactly one of these "
                            f"categories: {CATEGORY_LIST_STR}\n\n"
                            f"Also normalize the merchant name to a clean, "
                            f"human-friendly name and provide a confidence score "
                            f"(0.0 to 1.0).\n\n"
                            f"Transactions:\n{txn_block}\n\n"
                            f"Reply with a JSON array where each element has keys: "
                            f'"index", "category", "confidence", '
                            f'"merchant_normalized".\n'
                            f"Output ONLY valid JSON, no other text."
                        ),
                    }
                ],
            )
            raw = response.choices[0].message.content.strip()
            if raw.startswith("```"):
                lines = raw.split("\n")
                lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw = "\n".join(lines)
            results = json.loads(raw)
            output: list[dict[str, Any]] = []
            for item in results:
                cat = item.get("category", "Uncategorized")
                if cat not in CATEGORIES:
                    lower = cat.lower()
                    matched = False
                    for c in CATEGORIES:
                        if c.lower() == lower:
                            cat = c
                            matched = True
                            break
                    if not matched:
                        cat = "Uncategorized"
                output.append({
                    "category": cat,
                    "confidence": float(item.get("confidence", 0.5)),
                    "merchant_normalized": item.get("merchant_normalized"),
                })
            return output
        except Exception:
            logger.exception("OpenAI categorize_batch failed")
            return [
                {"category": "Uncategorized", "confidence": 0.0,
                 "merchant_normalized": None}
                for _ in transactions
            ]

    async def query(self, question: str, context: dict[str, Any]) -> str:
        try:
            client = self._client()
            context_str = json.dumps(context, default=str, indent=2)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=2048,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful personal finance assistant. "
                            "Answer questions about the user's finances based on "
                            "the provided data. Be concise and specific. Use dollar "
                            "amounts when relevant (convert cents to dollars by "
                            "dividing by 100)."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Here is my financial data:\n{context_str}\n\n"
                            f"Question: {question}"
                        ),
                    },
                ],
            )
            return response.choices[0].message.content.strip()
        except Exception:
            logger.exception("OpenAI query failed")
            return "Sorry, I couldn't process your question right now."

    async def normalize_merchant(self, raw_name: str) -> str:
        try:
            client = self._client()
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=100,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Normalize this merchant name to a clean, "
                            f"human-friendly name. Remove transaction codes, "
                            f"location info, and extra numbers.\n\n"
                            f"Raw name: {raw_name}\n\n"
                            f"Reply with ONLY the cleaned merchant name."
                        ),
                    }
                ],
            )
            return response.choices[0].message.content.strip()
        except Exception:
            logger.exception("OpenAI normalize_merchant failed")
            return raw_name

    async def summarize(self, transactions: list[dict[str, Any]]) -> str:
        try:
            client = self._client()
            txn_lines = []
            for txn in transactions[:200]:
                desc = txn.get("description", "")
                amount = txn.get("amount_cents", 0)
                cat = txn.get("category_name", "Uncategorized")
                txn_lines.append(
                    f"- {desc}: ${amount / 100:.2f} ({cat})"
                )
            txn_block = "\n".join(txn_lines)

            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=2048,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Provide a concise spending summary for these "
                            f"transactions. Include total spending, top categories, "
                            f"and any notable patterns.\n\n"
                            f"Transactions:\n{txn_block}"
                        ),
                    }
                ],
            )
            return response.choices[0].message.content.strip()
        except Exception:
            logger.exception("OpenAI summarize failed")
            return "Unable to generate summary at this time."


def register_plugin() -> None:
    registry.register("ai", OpenAIProvider())
