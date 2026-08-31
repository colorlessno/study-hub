"""init system09 tables

Revision ID: 20260414_0006
Revises: 20260414_0005
Create Date: 2026-04-14 23:58:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260414_0006"
down_revision = "20260414_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system09_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("research_type", sa.String(length=50), nullable=False),
        sa.Column("theme", sa.String(length=255), nullable=False),
        sa.Column("targets", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column("own_company", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("depth", sa.String(length=20), nullable=False, server_default="standard"),
        sa.Column("focus_areas", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("search_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("executive_summary", sa.Text(), nullable=True),
        sa.Column("key_findings", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("companies", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("comparison_table", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("swot", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("trends", sa.Text(), nullable=True),
        sa.Column("limitations", sa.Text(), nullable=True),
        sa.Column("markdown", sa.Text(), nullable=True),
        sa.Column("sources_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("query_log_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("target_normalized_key", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system09_reports_research_type", "system09_reports", ["research_type"])
    op.create_index("idx_system09_reports_created_at", "system09_reports", ["created_at"])
    op.create_index("idx_system09_reports_target_key", "system09_reports", ["target_normalized_key"])


def downgrade() -> None:
    op.drop_index("idx_system09_reports_target_key", table_name="system09_reports")
    op.drop_index("idx_system09_reports_created_at", table_name="system09_reports")
    op.drop_index("idx_system09_reports_research_type", table_name="system09_reports")
    op.drop_table("system09_reports")
