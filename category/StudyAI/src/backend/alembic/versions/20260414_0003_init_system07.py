"""init system07 tables

Revision ID: 20260414_0003
Revises: 20260414_0002
Create Date: 2026-04-14 22:10:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260414_0003"
down_revision = "20260414_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system07_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("file_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("file_size", sa.BigInteger(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("sub_category", sa.String(length=50), nullable=True),
        sa.Column("document_type", sa.String(length=50), nullable=True),
        sa.Column("importance", sa.String(length=10), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("registered_by", sa.String(length=100), nullable=False),
        sa.Column("access_roles", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system07_documents_category", "system07_documents", ["category"])
    op.create_index("idx_system07_documents_document_type", "system07_documents", ["document_type"])
    op.create_index("idx_system07_documents_importance", "system07_documents", ["importance"])
    op.create_index("idx_system07_documents_is_active", "system07_documents", ["is_active"])

    op.create_table(
        "system07_document_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("system07_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_no", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("section", sa.String(length=255), nullable=True),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("document_id", "chunk_no", name="uq_system07_document_chunks_document_chunk_no"),
    )
    op.create_index("idx_system07_document_chunks_document_id", "system07_document_chunks", ["document_id"])
    op.execute(
        "CREATE INDEX idx_system07_document_chunks_embedding "
        "ON system07_document_chunks USING ivfflat (embedding vector_cosine_ops)"
    )

    op.create_table(
        "system07_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("normalized_name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("synonyms", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("use_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("merged_to_tag_id", sa.Integer(), sa.ForeignKey("system07_tags.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "system07_document_tags",
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("system07_documents.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", sa.Integer(), sa.ForeignKey("system07_tags.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("is_auto", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system07_document_tags_tag_id", "system07_document_tags", ["tag_id"])

    op.create_table(
        "system07_access_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("system07_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("query", sa.Text(), nullable=True),
        sa.Column("accessed_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system07_access_logs_document_id", "system07_access_logs", ["document_id"])
    op.create_index("idx_system07_access_logs_accessed_at", "system07_access_logs", ["accessed_at"])


def downgrade() -> None:
    op.drop_index("idx_system07_access_logs_accessed_at", table_name="system07_access_logs")
    op.drop_index("idx_system07_access_logs_document_id", table_name="system07_access_logs")
    op.drop_table("system07_access_logs")
    op.drop_index("idx_system07_document_tags_tag_id", table_name="system07_document_tags")
    op.drop_table("system07_document_tags")
    op.drop_table("system07_tags")
    op.execute("DROP INDEX IF EXISTS idx_system07_document_chunks_embedding")
    op.drop_index("idx_system07_document_chunks_document_id", table_name="system07_document_chunks")
    op.drop_table("system07_document_chunks")
    op.drop_index("idx_system07_documents_is_active", table_name="system07_documents")
    op.drop_index("idx_system07_documents_importance", table_name="system07_documents")
    op.drop_index("idx_system07_documents_document_type", table_name="system07_documents")
    op.drop_index("idx_system07_documents_category", table_name="system07_documents")
    op.drop_table("system07_documents")
