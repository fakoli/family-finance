from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.parser_schema import ParserSchema

logger = logging.getLogger(__name__)

TARGET_FIELDS = [
    "date",
    "amount_cents",
    "description",
    "merchant_name",
    "category_name",
    "account_name",
    "institution_name",
    "account_type",
]

INFERENCE_PROMPT = """\
You are a financial data parser expert. Analyze the following file sample and return a JSON object \
that describes how to parse this file format.

Filename: {filename}

First lines of the file:
```
{sample}
```

Return a JSON object with exactly these keys:

1. "detection_rules": an object describing how to identify this file format. Include:
   - "file_extension": list of file extensions (e.g. [".csv"])
   - "header_contains": list of distinctive column names from the header row that uniquely \
identify this format (pick 2-4 most distinctive ones)

2. "column_mapping": an object mapping target field names to source column names found in \
the file header. Target fields are: {target_fields}
   - Only include mappings where you can confidently identify the source column
   - "amount_cents" should map to the column containing monetary amounts (the value will be \
multiplied by 100 to convert to cents)

3. "transform_rules": an object with optional transformation rules:
   - "delimiter": the field separator (default ",")
   - "date_format": strftime format string for the date column (e.g. "%m/%d/%Y")
   - "amount_multiplier": number to multiply raw amount by to get cents (typically 100)
   - "defaults": object of default values for fields not present in the file

Return ONLY the JSON object, no explanation or markdown fences.
"""


async def infer_schema(filename: str, file_content: bytes) -> dict:
    """Analyze file content using Claude API and return inferred parser schema."""
    lines = file_content.decode("utf-8", errors="replace").split("\n")[:30]
    sample = "\n".join(lines)

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = await client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": INFERENCE_PROMPT.format(
                    filename=filename,
                    sample=sample,
                    target_fields=", ".join(TARGET_FIELDS),
                ),
            }
        ],
    )

    block = response.content[0]
    raw_text = block.text.strip()  # type: ignore[union-attr]
    # Strip markdown fences if present
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    result = json.loads(raw_text)
    logger.info("AI inferred schema for '%s': %s", filename, list(result.keys()))
    return result


async def infer_and_save_schema(
    db: AsyncSession, filename: str, file_content: bytes
) -> ParserSchema:
    """Infer a parser schema from file content and persist it to the database."""
    inferred = await infer_schema(filename, file_content)

    # Generate a descriptive name from the filename
    stem = Path(filename).stem
    name = f"ai-inferred-{stem}".replace(" ", "-").lower()[:255]

    ext = Path(filename).suffix.lower().lstrip(".")
    file_type = ext if ext in ("csv", "tsv", "ofx", "qfx", "pdf") else "csv"

    schema = ParserSchema(
        name=name,
        description=f"Auto-inferred schema for {filename}",
        file_type=file_type,
        detection_rules=inferred.get("detection_rules", {}),
        column_mapping=inferred.get("column_mapping", {}),
        transform_rules=inferred.get("transform_rules", {}),
        is_active=True,
        created_by_ai=True,
        sample_data={"source_filename": filename},
    )
    db.add(schema)
    await db.commit()
    await db.refresh(schema)

    logger.info("Saved AI-inferred parser schema '%s' (id=%s)", schema.name, schema.id)
    return schema
