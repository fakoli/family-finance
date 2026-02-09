"""add parser_schemas table

Revision ID: 004
Revises: 003
Create Date: 2026-02-08
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "parser_schemas",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("detection_rules", JSON, nullable=False),
        sa.Column("column_mapping", JSON, nullable=False),
        sa.Column("transform_rules", JSON, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_by_ai", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("sample_data", JSON, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_unique_constraint("uq_parser_schemas_name", "parser_schemas", ["name"])
    op.create_index("ix_parser_schemas_name", "parser_schemas", ["name"])


def downgrade() -> None:
    op.drop_index("ix_parser_schemas_name", table_name="parser_schemas")
    op.drop_constraint("uq_parser_schemas_name", "parser_schemas", type_="unique")
    op.drop_table("parser_schemas")
