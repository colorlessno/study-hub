"""init system03 tables

Revision ID: 20260414_0002
Revises: 20260414_0001
Create Date: 2026-04-14 18:30:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260414_0002"
down_revision = "20260414_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system03_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.String(length=50), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("version", sa.String(length=50), nullable=True),
        sa.Column("access_roles", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("source_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system03_documents_project_id", "system03_documents", ["project_id"])
    op.create_index("idx_system03_documents_category", "system03_documents", ["category"])
    op.create_index("idx_system03_documents_is_active", "system03_documents", ["is_active"])

    op.create_table(
        "system03_document_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("system03_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_no", sa.Integer(), nullable=False),
        sa.Column("section_title", sa.String(length=255), nullable=True),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("document_id", "chunk_no", name="uq_system03_document_chunks_document_chunk_no"),
    )
    op.create_index("idx_system03_document_chunks_document_id", "system03_document_chunks", ["document_id"])
    op.execute(
        "CREATE INDEX idx_system03_document_chunks_embedding "
        "ON system03_document_chunks USING ivfflat (embedding vector_cosine_ops)"
    )

    op.create_table(
        "system03_sessions",
        sa.Column("session_id", sa.String(length=50), primary_key=True),
        sa.Column("project_id", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.String(length=50), nullable=True),
        sa.Column("short_memory", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "system03_question_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.String(length=50), sa.ForeignKey("system03_sessions.session_id"), nullable=False),
        sa.Column("project_id", sa.String(length=50), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("confidence", sa.String(length=10), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("feedback_comment", sa.Text(), nullable=True),
        sa.Column("answer_status", sa.String(length=20), nullable=False, server_default="answered"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("rating IS NULL OR rating BETWEEN 1 AND 5", name="chk_system03_question_logs_rating"),
    )
    op.create_index("idx_system03_question_logs_project_id", "system03_question_logs", ["project_id"])
    op.create_index("idx_system03_question_logs_created_at", "system03_question_logs", ["created_at"])
    op.create_index("idx_system03_question_logs_status", "system03_question_logs", ["answer_status"])


def downgrade() -> None:
    op.drop_index("idx_system03_question_logs_status", table_name="system03_question_logs")
    op.drop_index("idx_system03_question_logs_created_at", table_name="system03_question_logs")
    op.drop_index("idx_system03_question_logs_project_id", table_name="system03_question_logs")
    op.drop_table("system03_question_logs")
    op.drop_table("system03_sessions")
    op.execute("DROP INDEX IF EXISTS idx_system03_document_chunks_embedding")
    op.drop_index("idx_system03_document_chunks_document_id", table_name="system03_document_chunks")
    op.drop_table("system03_document_chunks")
    op.drop_index("idx_system03_documents_is_active", table_name="system03_documents")
    op.drop_index("idx_system03_documents_category", table_name="system03_documents")
    op.drop_index("idx_system03_documents_project_id", table_name="system03_documents")
    op.drop_table("system03_documents")
