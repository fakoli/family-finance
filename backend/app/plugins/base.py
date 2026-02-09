from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class FileParserPlugin(ABC):
    name: str = ""
    supported_extensions: list[str] = []

    @abstractmethod
    async def parse(self, file_content: bytes, filename: str) -> list[dict[str, Any]]:
        """Parse file content and return list of transaction dicts."""

    @abstractmethod
    def detect(self, file_content: bytes, filename: str) -> bool:
        """Return True if this parser can handle the file."""


class DataSourcePlugin(ABC):
    name: str = ""

    @abstractmethod
    async def fetch_transactions(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Fetch transactions from the data source."""

    @abstractmethod
    async def fetch_accounts(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Fetch accounts from the data source."""


class AIProviderPlugin(ABC):
    name: str = ""

    @abstractmethod
    async def categorize(self, description: str) -> str | None:
        """Suggest a category for a transaction description."""

    @abstractmethod
    async def categorize_batch(
        self, transactions: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Categorize a batch of transactions. Returns list of dicts with keys:
        category, confidence, merchant_normalized."""

    @abstractmethod
    async def query(self, question: str, context: dict[str, Any]) -> str:
        """Answer a natural language question given financial context."""

    @abstractmethod
    async def normalize_merchant(self, raw_name: str) -> str:
        """Clean up a raw merchant name into a human-friendly name."""

    @abstractmethod
    async def summarize(self, transactions: list[dict[str, Any]]) -> str:
        """Generate a spending summary."""


class NotificationPlugin(ABC):
    name: str = ""

    @abstractmethod
    async def send(self, subject: str, body: str, **kwargs: Any) -> bool:
        """Send a notification."""
