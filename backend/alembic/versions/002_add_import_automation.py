"""add import automation columns and enum values

Revision ID: 002
Revises: 001
Create Date: 2026-02-08
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new enum values to import_status_enum
    op.execute(sa.text("ALTER TYPE import_status_enum ADD VALUE IF NOT EXISTS 'categorizing'"))
    op.execute(sa.text("ALTER TYPE import_status_enum ADD VALUE IF NOT EXISTS 'partially_failed'"))

    # Add new columns to import_jobs
    op.add_column("import_jobs", sa.Column(
        "processed_rows", sa.Integer(), nullable=False, server_default=sa.text("0"),
    ))
    op.add_column("import_jobs", sa.Column(
        "categorized_rows", sa.Integer(), nullable=False, server_default=sa.text("0"),
    ))
    op.add_column("import_jobs", sa.Column(
        "uncategorized_rows", sa.Integer(), nullable=False, server_default=sa.text("0"),
    ))
    op.add_column("import_jobs", sa.Column(
        "celery_task_id", sa.String(255), nullable=True,
    ))
    op.add_column("import_jobs", sa.Column(
        "source", sa.String(50), nullable=False, server_default=sa.text("'upload'"),
    ))
    op.add_column("import_jobs", sa.Column(
        "file_path", sa.String(500), nullable=True,
    ))


def downgrade() -> None:
    op.drop_column("import_jobs", "file_path")
    op.drop_column("import_jobs", "source")
    op.drop_column("import_jobs", "celery_task_id")
    op.drop_column("import_jobs", "uncategorized_rows")
    op.drop_column("import_jobs", "categorized_rows")
    op.drop_column("import_jobs", "processed_rows")
    # Note: PostgreSQL does not support removing values from enums.
    # To fully revert, you'd need to recreate the enum type.
