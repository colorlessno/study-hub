"""init system04 tables

Revision ID: 20260415_0012
Revises: 20260415_0011
Create Date: 2026-04-15 04:30:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260415_0012"
down_revision = "20260415_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system04_analyses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("total_reviews", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sentiment_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("topics", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("insights", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("comparison_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("compare_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system04_analyses_created_at", "system04_analyses", ["created_at"])
    op.create_index("idx_system04_analyses_product_name", "system04_analyses", ["product_name"])

    op.create_table(
        "system04_review_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("analysis_id", sa.Integer(), sa.ForeignKey("system04_analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_id", sa.String(length=100), nullable=True),
        sa.Column("product_name", sa.String(length=255), nullable=True),
        sa.Column("review_score", sa.Numeric(2, 1), nullable=True),
        sa.Column("review_date", sa.Date(), nullable=True),
        sa.Column("review_excerpt", sa.Text(), nullable=False),
        sa.Column("sentiment", sa.String(length=20), nullable=False),
        sa.Column("sentiment_score", sa.Numeric(3, 2), nullable=False),
        sa.Column("intensity", sa.String(length=10), nullable=False),
        sa.Column("topics", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system04_review_results_analysis_id", "system04_review_results", ["analysis_id"])
    op.create_index("idx_system04_review_results_sentiment", "system04_review_results", ["sentiment"])


def downgrade() -> None:
    op.drop_index("idx_system04_review_results_sentiment", table_name="system04_review_results")
    op.drop_index("idx_system04_review_results_analysis_id", table_name="system04_review_results")
    op.drop_table("system04_review_results")
    op.drop_index("idx_system04_analyses_product_name", table_name="system04_analyses")
    op.drop_index("idx_system04_analyses_created_at", table_name="system04_analyses")
    op.drop_table("system04_analyses")
