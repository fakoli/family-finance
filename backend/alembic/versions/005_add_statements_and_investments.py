"""add statements, brokerage_holdings, and tax_documents tables

Revision ID: 005
Revises: 004
Create Date: 2026-02-22
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

document_type_enum = postgresql.ENUM(
    "bank_statement",
    "credit_card_statement",
    "mortgage_statement",
    "brokerage_statement",
    "tax_form",
    name="document_type_enum",
    create_type=False,
)


def upgrade() -> None:
    # Create enum explicitly with IF NOT EXISTS for idempotency
    op.execute(
        sa.text(
            "DO $$ BEGIN "
            "CREATE TYPE document_type_enum AS ENUM "
            "('bank_statement','credit_card_statement','mortgage_statement',"
            "'brokerage_statement','tax_form'); "
            "EXCEPTION WHEN duplicate_object THEN NULL; "
            "END $$;"
        )
    )

    op.create_table(
        "statements",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("account_id", sa.UUID(), nullable=True),
        sa.Column("import_job_id", sa.UUID(), nullable=True),
        sa.Column("document_type", document_type_enum, nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("institution_name", sa.String(255), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("tax_year", sa.Integer(), nullable=True),
        sa.Column("metadata", postgresql.JSON(), nullable=True),
        sa.Column("file_path", sa.String(500), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["import_job_id"], ["import_jobs.id"]),
    )
    op.create_index("ix_statements_user_id", "statements", ["user_id"])
    op.create_index("ix_statements_account_id", "statements", ["account_id"])

    op.create_table(
        "brokerage_holdings",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("account_id", sa.UUID(), nullable=False),
        sa.Column("statement_id", sa.UUID(), nullable=True),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=18, scale=8), nullable=False),
        sa.Column("cost_basis_cents", sa.Integer(), nullable=True),
        sa.Column("market_value_cents", sa.Integer(), nullable=False),
        sa.Column("unrealized_gain_cents", sa.Integer(), nullable=True),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["statement_id"], ["statements.id"]),
    )
    op.create_index("ix_brokerage_holdings_user_id", "brokerage_holdings", ["user_id"])
    op.create_index("ix_brokerage_holdings_account_id", "brokerage_holdings", ["account_id"])
    op.create_index("ix_brokerage_holdings_symbol", "brokerage_holdings", ["symbol"])
    op.create_index("ix_brokerage_holdings_snapshot_date", "brokerage_holdings", ["snapshot_date"])

    op.create_table(
        "tax_documents",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("statement_id", sa.UUID(), nullable=False),
        sa.Column("form_type", sa.String(50), nullable=False),
        sa.Column("tax_year", sa.Integer(), nullable=False),
        sa.Column("issuer", sa.String(255), nullable=False),
        sa.Column("extracted_data", postgresql.JSON(), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["statement_id"], ["statements.id"]),
    )
    op.create_index("ix_tax_documents_user_id", "tax_documents", ["user_id"])
    op.create_index("ix_tax_documents_statement_id", "tax_documents", ["statement_id"])
    op.create_index("ix_tax_documents_tax_year", "tax_documents", ["tax_year"])


def downgrade() -> None:
    op.drop_table("tax_documents")
    op.drop_table("brokerage_holdings")
    op.drop_table("statements")
    op.execute("DROP TYPE IF EXISTS document_type_enum")
