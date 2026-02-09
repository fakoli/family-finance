from __future__ import annotations

import io
import logging
import re
from typing import Any

import pandas as pd
from sqlalchemy import select

from app.database import sync_session_factory
from app.models.parser_schema import ParserSchema
from app.plugins import registry
from app.plugins.base import FileParserPlugin

logger = logging.getLogger(__name__)


class SchemaBasedParser(FileParserPlugin):
    name = "schema_based"
    supported_extensions = [".csv", ".tsv"]

    def __init__(self) -> None:
        self._schemas: list[dict[str, Any]] = []
        self._loaded = False

    def _load_schemas(self) -> None:
        """Load active parser schemas from the database via sync session."""
        try:
            with sync_session_factory() as session:
                stmt = select(ParserSchema).where(ParserSchema.is_active.is_(True))
                rows = session.execute(stmt).scalars().all()
                self._schemas = [
                    {
                        "id": str(row.id),
                        "name": row.name,
                        "file_type": row.file_type,
                        "detection_rules": row.detection_rules,
                        "column_mapping": row.column_mapping,
                        "transform_rules": row.transform_rules,
                    }
                    for row in rows
                ]
                self._loaded = True
                logger.info("Loaded %d parser schemas from DB", len(self._schemas))
        except Exception:
            logger.exception("Failed to load parser schemas from DB")
            self._schemas = []
            self._loaded = True

    def reload_schemas(self) -> None:
        """Force reload schemas from the database."""
        self._loaded = False
        self._load_schemas()

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self._load_schemas()

    def _match_schema(
        self, file_content: bytes, filename: str
    ) -> dict[str, Any] | None:
        """Find the first schema whose detection_rules match the file."""
        self._ensure_loaded()
        for schema in self._schemas:
            rules = schema["detection_rules"]
            if not self._check_rules(rules, file_content, filename):
                continue
            return schema
        return None

    def _check_rules(
        self, rules: dict[str, Any], file_content: bytes, filename: str
    ) -> bool:
        """Evaluate detection_rules against file content and filename.

        Supported rules:
        - file_extension: list of extensions (e.g. [".csv"])
        - header_contains: list of strings that must appear in the first line
        - header_pattern: regex pattern to match the first line
        - filename_pattern: regex pattern to match the filename
        """
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        if "file_extension" in rules:
            if ext not in rules["file_extension"]:
                return False

        try:
            first_line = file_content.split(b"\n", 1)[0].decode("utf-8").strip()
        except Exception:
            first_line = ""

        if "header_contains" in rules:
            for required in rules["header_contains"]:
                if required not in first_line:
                    return False

        if "header_pattern" in rules:
            if not re.search(rules["header_pattern"], first_line):
                return False

        if "filename_pattern" in rules:
            if not re.search(rules["filename_pattern"], filename, re.IGNORECASE):
                return False

        return True

    def detect(self, file_content: bytes, filename: str) -> bool:
        return self._match_schema(file_content, filename) is not None

    async def parse(
        self, file_content: bytes, filename: str
    ) -> list[dict[str, Any]]:
        schema = self._match_schema(file_content, filename)
        if schema is None:
            return []

        column_mapping = schema["column_mapping"]
        transform_rules = schema.get("transform_rules", {})

        separator = transform_rules.get("delimiter", ",")
        df = pd.read_csv(
            io.BytesIO(file_content),
            dtype=str,
            keep_default_na=False,
            sep=separator,
        )
        df.columns = [c.strip() for c in df.columns]

        results: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            record: dict[str, Any] = {}
            for target_field, source_col in column_mapping.items():
                record[target_field] = str(row.get(source_col, "")).strip()

            # Apply amount conversion if configured
            if "amount_multiplier" in transform_rules and "amount_cents" in record:
                try:
                    raw = float(record["amount_cents"])
                    multiplier = float(transform_rules["amount_multiplier"])
                    record["amount_cents"] = round(raw * multiplier)
                except (ValueError, TypeError):
                    record["amount_cents"] = 0
            elif "amount_cents" in record:
                try:
                    record["amount_cents"] = round(float(record["amount_cents"]) * 100)
                except (ValueError, TypeError):
                    record["amount_cents"] = 0

            # Apply date format normalization
            if "date_format" in transform_rules and "date" in record:
                try:
                    from datetime import datetime

                    parsed = datetime.strptime(record["date"], transform_rules["date_format"])
                    record["date"] = parsed.strftime("%Y-%m-%d")
                except (ValueError, TypeError):
                    pass  # keep original

            # Apply default values
            for field, default in transform_rules.get("defaults", {}).items():
                if not record.get(field):
                    record[field] = default

            results.append(record)

        logger.info(
            "Parsed %d rows using schema '%s'", len(results), schema["name"]
        )
        return results


def register_plugin() -> None:
    registry.register("parser", SchemaBasedParser())
