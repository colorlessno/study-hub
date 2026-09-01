"""add system14 rag knowledge entries

Revision ID: 20260901_0020
Revises: 20260901_0019
Create Date: 2026-09-01 00:20:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260901_0020"
down_revision = "20260901_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "system14_knowledge_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_key", sa.String(length=120), nullable=False, unique=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("product", sa.String(length=100), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "source_type IN ('faq', 'utterance', 'sales_score', 'crm_history')",
            name="chk_system14_knowledge_entries_source_type",
        ),
    )
    op.create_index(
        "idx_system14_knowledge_entries_source_type",
        "system14_knowledge_entries",
        ["source_type"],
    )
    op.create_index(
        "idx_system14_knowledge_entries_product",
        "system14_knowledge_entries",
        ["product"],
    )
    op.execute(
        "CREATE INDEX idx_system14_knowledge_entries_embedding "
        "ON system14_knowledge_entries USING ivfflat (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_system14_knowledge_entries_embedding")
    op.drop_index(
        "idx_system14_knowledge_entries_product",
        table_name="system14_knowledge_entries",
    )
    op.drop_index(
        "idx_system14_knowledge_entries_source_type",
        table_name="system14_knowledge_entries",
    )
    op.drop_table("system14_knowledge_entries")
