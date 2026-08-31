"""add system16 asynchronous bulk jobs

Revision ID: 20260828_0018
Revises: 20260422_0017
Create Date: 2026-08-28 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260828_0018"
down_revision = "20260422_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system16_bulk_jobs",
        sa.Column("id", sa.String(length=50), primary_key=True),
        sa.Column("bulk_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("total_candidates", sa.Integer(), nullable=False),
        sa.Column("succeeded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("bulk_id", name="uq_system16_bulk_jobs_bulk_id"),
    )
    op.create_index("idx_system16_bulk_jobs_status", "system16_bulk_jobs", ["status"])
    op.create_index("idx_system16_bulk_jobs_created_at", "system16_bulk_jobs", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_system16_bulk_jobs_created_at", table_name="system16_bulk_jobs")
    op.drop_index("idx_system16_bulk_jobs_status", table_name="system16_bulk_jobs")
    op.drop_table("system16_bulk_jobs")
