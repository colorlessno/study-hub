"""init system02 tables

Revision ID: 20260415_0011
Revises: 20260415_0010
Create Date: 2026-04-15 02:20:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260415_0011"
down_revision = "20260415_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system02_contract_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("review_type", sa.String(length=20), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("file_hash", sa.String(length=64), nullable=True),
        sa.Column("file_hash_b", sa.String(length=64), nullable=True),
        sa.Column("document_type", sa.String(length=50), nullable=True),
        sa.Column("perspective", sa.String(length=30), nullable=True),
        sa.Column("overall_risk", sa.String(length=20), nullable=True),
        sa.Column("recommendation", sa.String(length=30), nullable=True),
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("total_issues", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("compare_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system02_contract_reviews_created_at", "system02_contract_reviews", ["created_at"])
    op.create_index("idx_system02_contract_reviews_document_type", "system02_contract_reviews", ["document_type"])
    op.create_index("idx_system02_contract_reviews_recommendation", "system02_contract_reviews", ["recommendation"])
    op.create_index("idx_system02_contract_reviews_review_type", "system02_contract_reviews", ["review_type"])

    op.create_table(
        "system02_contract_issues",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("review_id", sa.Integer(), sa.ForeignKey("system02_contract_reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("issue_type", sa.String(length=30), nullable=False),
        sa.Column("severity", sa.String(length=10), nullable=False),
        sa.Column("article", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("risk_explanation", sa.Text(), nullable=True),
        sa.Column("suggested_text", sa.Text(), nullable=True),
        sa.Column("original_text", sa.Text(), nullable=True),
        sa.Column("position_start", sa.Integer(), nullable=True),
        sa.Column("position_end", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system02_contract_issues_review_id", "system02_contract_issues", ["review_id"])
    op.create_index("idx_system02_contract_issues_severity", "system02_contract_issues", ["severity"])
    op.create_index("idx_system02_contract_issues_type", "system02_contract_issues", ["issue_type"])


def downgrade() -> None:
    op.drop_index("idx_system02_contract_issues_type", table_name="system02_contract_issues")
    op.drop_index("idx_system02_contract_issues_severity", table_name="system02_contract_issues")
    op.drop_index("idx_system02_contract_issues_review_id", table_name="system02_contract_issues")
    op.drop_table("system02_contract_issues")
    op.drop_index("idx_system02_contract_reviews_review_type", table_name="system02_contract_reviews")
    op.drop_index("idx_system02_contract_reviews_recommendation", table_name="system02_contract_reviews")
    op.drop_index("idx_system02_contract_reviews_document_type", table_name="system02_contract_reviews")
    op.drop_index("idx_system02_contract_reviews_created_at", table_name="system02_contract_reviews")
    op.drop_table("system02_contract_reviews")
