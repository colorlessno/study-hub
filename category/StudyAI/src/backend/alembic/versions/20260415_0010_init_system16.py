"""init system16 tables

Revision ID: 20260415_0010
Revises: 20260415_0009
Create Date: 2026-04-15 01:40:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260415_0010"
down_revision = "20260415_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system16_match_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("requirement_text", sa.Text(), nullable=False),
        sa.Column("candidate_data_masked", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("score", sa.Numeric(5, 2), nullable=False),
        sa.Column("level", sa.String(length=20), nullable=True),
        sa.Column("parse_confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column("review_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("review_reasons", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("score_breakdown", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("report", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("similar_cases", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("bulk_id", sa.Integer(), nullable=True),
        sa.Column("candidate_id", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system16_match_results_created_at", "system16_match_results", ["created_at"])
    op.create_index("idx_system16_match_results_score", "system16_match_results", ["score"])
    op.create_index("idx_system16_match_results_bulk_id", "system16_match_results", ["bulk_id"])
    op.create_index("idx_system16_match_results_review_required", "system16_match_results", ["review_required"])

    op.create_table(
        "system16_past_knowledge",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("requirement_summary", sa.Text(), nullable=False),
        sa.Column("candidate_profile", sa.Text(), nullable=True),
        sa.Column("result", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system16_past_knowledge_result", "system16_past_knowledge", ["result"])
    op.execute(
        "CREATE INDEX idx_system16_past_knowledge_embedding "
        "ON system16_past_knowledge USING ivfflat (embedding vector_cosine_ops)"
    )

    op.create_table(
        "system16_skill_aliases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("canonical_name", sa.String(length=100), nullable=False),
        sa.Column("alias_name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("alias_name", "category", name="uq_system16_skill_aliases_alias_category"),
    )
    op.create_index("idx_system16_skill_aliases_canonical_name", "system16_skill_aliases", ["canonical_name"])
    op.create_index("idx_system16_skill_aliases_category", "system16_skill_aliases", ["category"])


def downgrade() -> None:
    op.drop_index("idx_system16_skill_aliases_category", table_name="system16_skill_aliases")
    op.drop_index("idx_system16_skill_aliases_canonical_name", table_name="system16_skill_aliases")
    op.drop_table("system16_skill_aliases")
    op.execute("DROP INDEX IF EXISTS idx_system16_past_knowledge_embedding")
    op.drop_index("idx_system16_past_knowledge_result", table_name="system16_past_knowledge")
    op.drop_table("system16_past_knowledge")
    op.drop_index("idx_system16_match_results_review_required", table_name="system16_match_results")
    op.drop_index("idx_system16_match_results_bulk_id", table_name="system16_match_results")
    op.drop_index("idx_system16_match_results_score", table_name="system16_match_results")
    op.drop_index("idx_system16_match_results_created_at", table_name="system16_match_results")
    op.drop_table("system16_match_results")
