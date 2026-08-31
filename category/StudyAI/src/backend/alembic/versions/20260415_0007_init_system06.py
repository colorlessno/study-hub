"""init system06 tables

Revision ID: 20260415_0007
Revises: 20260414_0006
Create Date: 2026-04-15 00:40:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260415_0007"
down_revision = "20260414_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system06_sessions",
        sa.Column("session_id", sa.String(length=50), primary_key=True),
        sa.Column("user_id", sa.String(length=50), nullable=True),
        sa.Column("history_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "system06_inquiries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.String(length=50), sa.ForeignKey("system06_sessions.session_id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", sa.String(length=50), nullable=True),
        sa.Column("channel", sa.String(length=20), nullable=False, server_default="form"),
        sa.Column("order_id", sa.String(length=100), nullable=True),
        sa.Column("member_id", sa.String(length=100), nullable=True),
        sa.Column("message_masked", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("priority", sa.String(length=10), nullable=True),
        sa.Column("confidence", sa.String(length=10), nullable=True),
        sa.Column("response_type", sa.String(length=20), nullable=True),
        sa.Column("response_message", sa.Text(), nullable=True),
        sa.Column("response_sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("next_actions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("is_resolved", sa.Boolean(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("feedback_comment", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("assignee", sa.String(length=255), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("escalated", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("escalation_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system06_inquiries_created_at", "system06_inquiries", ["created_at"])
    op.create_index("idx_system06_inquiries_status", "system06_inquiries", ["status"])
    op.create_index("idx_system06_inquiries_category", "system06_inquiries", ["category"])
    op.create_index("idx_system06_inquiries_user_category", "system06_inquiries", ["user_id", "category"])

    op.create_table(
        "system06_faqs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("faq_no", sa.String(length=30), nullable=True, unique=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("use_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system06_faqs_category", "system06_faqs", ["category"])
    op.create_index("idx_system06_faqs_use_count", "system06_faqs", ["use_count"])
    op.execute(
        "CREATE INDEX idx_system06_faqs_embedding "
        "ON system06_faqs USING ivfflat (embedding vector_cosine_ops)"
    )

    op.create_table(
        "system06_escalations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inquiry_id", sa.Integer(), sa.ForeignKey("system06_inquiries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assignee", sa.String(length=255), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("notified_at", sa.DateTime(), nullable=True),
        sa.Column("handled_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system06_escalations_inquiry", "system06_escalations", ["inquiry_id"])
    op.create_index("idx_system06_escalations_assignee", "system06_escalations", ["assignee"])


def downgrade() -> None:
    op.drop_index("idx_system06_escalations_assignee", table_name="system06_escalations")
    op.drop_index("idx_system06_escalations_inquiry", table_name="system06_escalations")
    op.drop_table("system06_escalations")
    op.execute("DROP INDEX IF EXISTS idx_system06_faqs_embedding")
    op.drop_index("idx_system06_faqs_use_count", table_name="system06_faqs")
    op.drop_index("idx_system06_faqs_category", table_name="system06_faqs")
    op.drop_table("system06_faqs")
    op.drop_index("idx_system06_inquiries_user_category", table_name="system06_inquiries")
    op.drop_index("idx_system06_inquiries_category", table_name="system06_inquiries")
    op.drop_index("idx_system06_inquiries_status", table_name="system06_inquiries")
    op.drop_index("idx_system06_inquiries_created_at", table_name="system06_inquiries")
    op.drop_table("system06_inquiries")
    op.drop_table("system06_sessions")
