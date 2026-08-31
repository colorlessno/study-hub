"""init system10 tables

Revision ID: 20260414_0004
Revises: 20260414_0003
Create Date: 2026-04-14 22:40:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260414_0004"
down_revision = "20260414_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system10_file_index",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("file_name", sa.String(length=500), nullable=False),
        sa.Column("full_path", sa.Text(), nullable=False, unique=True),
        sa.Column("folder_path", sa.Text(), nullable=True),
        sa.Column("file_hash", sa.String(length=64), nullable=True),
        sa.Column("file_size", sa.BigInteger(), nullable=True),
        sa.Column("doc_type", sa.String(length=50), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("is_latest", sa.Boolean(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("scanned_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("idx_system10_file_index_folder_path", "system10_file_index", ["folder_path"])
    op.create_index("idx_system10_file_index_doc_type", "system10_file_index", ["doc_type"])
    op.create_index("idx_system10_file_index_is_latest", "system10_file_index", ["is_latest"])
    op.create_index("idx_system10_file_index_is_active", "system10_file_index", ["is_active"])
    op.execute(
        "CREATE INDEX idx_system10_file_index_embedding "
        "ON system10_file_index USING ivfflat (embedding vector_cosine_ops)"
    )

    op.create_table(
        "system10_scan_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scan_targets", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("scan_mode", sa.String(length=20), nullable=False),
        sa.Column("total_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("deleted_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicates_found", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued"),
        sa.Column("executed_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system10_scan_logs_executed_at", "system10_scan_logs", ["executed_at"])

    op.create_table(
        "system10_duplicate_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("file_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("similarity_type", sa.String(length=20), nullable=False),
        sa.Column("similarity_score", sa.Numeric(3, 2), nullable=False),
        sa.Column("latest_file_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system10_duplicate_groups_similarity", "system10_duplicate_groups", ["similarity_score"])


def downgrade() -> None:
    op.drop_index("idx_system10_duplicate_groups_similarity", table_name="system10_duplicate_groups")
    op.drop_table("system10_duplicate_groups")
    op.drop_index("idx_system10_scan_logs_executed_at", table_name="system10_scan_logs")
    op.drop_table("system10_scan_logs")
    op.execute("DROP INDEX IF EXISTS idx_system10_file_index_embedding")
    op.drop_index("idx_system10_file_index_is_active", table_name="system10_file_index")
    op.drop_index("idx_system10_file_index_is_latest", table_name="system10_file_index")
    op.drop_index("idx_system10_file_index_doc_type", table_name="system10_file_index")
    op.drop_index("idx_system10_file_index_folder_path", table_name="system10_file_index")
    op.drop_table("system10_file_index")
