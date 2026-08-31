"""init system12 tables

Revision ID: 20260415_0009
Revises: 20260415_0008
Create Date: 2026-04-15 02:20:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260415_0009"
down_revision = "20260415_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system12_products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("price", sa.Numeric(10, 0), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("attributes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("suitable_scenes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("suitable_recipients", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("formality", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("purchase_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system12_products_category", "system12_products", ["category"])
    op.create_index("idx_system12_products_active", "system12_products", ["is_active"])
    op.execute(
        "CREATE INDEX idx_system12_products_embedding "
        "ON system12_products USING ivfflat (embedding vector_cosine_ops)"
    )

    op.create_table(
        "system12_scenes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("formality", sa.Integer(), nullable=True),
        sa.Column("timing", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_table(
        "system12_recipients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("formality", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_table(
        "system12_ng_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scene_id", sa.Integer(), sa.ForeignKey("system12_scenes.id", ondelete="CASCADE"), nullable=True),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("system12_recipients.id", ondelete="CASCADE"), nullable=True),
        sa.Column("ng_attribute", sa.String(length=100), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=10), nullable=False, server_default="warn"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_table(
        "system12_sessions",
        sa.Column("session_id", sa.String(length=50), primary_key=True),
        sa.Column("collected_conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("recommended_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("history", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_table(
        "system12_recommendation_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.String(length=50), sa.ForeignKey("system12_sessions.session_id", ondelete="CASCADE"), nullable=False),
        sa.Column("conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("recommended", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("feedback", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system12_recommendation_logs_session", "system12_recommendation_logs", ["session_id"])


def downgrade() -> None:
    op.drop_index("idx_system12_recommendation_logs_session", table_name="system12_recommendation_logs")
    op.drop_table("system12_recommendation_logs")
    op.drop_table("system12_sessions")
    op.drop_table("system12_ng_rules")
    op.drop_table("system12_recipients")
    op.drop_table("system12_scenes")
    op.execute("DROP INDEX IF EXISTS idx_system12_products_embedding")
    op.drop_index("idx_system12_products_active", table_name="system12_products")
    op.drop_index("idx_system12_products_category", table_name="system12_products")
    op.drop_table("system12_products")
