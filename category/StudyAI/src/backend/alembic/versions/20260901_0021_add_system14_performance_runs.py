"""add system14 performance runs

Revision ID: 20260901_0021
Revises: 20260901_0020
Create Date: 2026-09-01 21:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260901_0021"
down_revision = "20260901_0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system14_performance_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "job_id",
            sa.String(length=50),
            sa.ForeignKey("system14_data_jobs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("requested_conversations", sa.Integer(), nullable=False),
        sa.Column("processed_conversations", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processed_utterances", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("target_seconds", sa.Numeric(10, 3), nullable=False),
        sa.Column("elapsed_seconds", sa.Numeric(10, 3), nullable=False),
        sa.Column("conversations_per_second", sa.Numeric(12, 3), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("target_met", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "status IN ('completed', 'failed')",
            name="chk_system14_performance_runs_status",
        ),
        sa.CheckConstraint(
            "requested_conversations >= 100 AND requested_conversations <= 5000",
            name="chk_system14_performance_runs_requested_conversations",
        ),
    )
    op.create_index(
        "idx_system14_performance_runs_created_at",
        "system14_performance_runs",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "idx_system14_performance_runs_created_at",
        table_name="system14_performance_runs",
    )
    op.drop_table("system14_performance_runs")
