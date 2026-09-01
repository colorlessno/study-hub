"""add system14 webhook receipts

Revision ID: 20260901_0022
Revises: 20260901_0021
Create Date: 2026-09-01 22:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260901_0022"
down_revision = "20260901_0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system14_webhook_receipts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index(
        "idx_system14_webhook_receipts_received_at",
        "system14_webhook_receipts",
        ["received_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "idx_system14_webhook_receipts_received_at",
        table_name="system14_webhook_receipts",
    )
    op.drop_table("system14_webhook_receipts")
