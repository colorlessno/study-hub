"""init system13 tables

Revision ID: 20260414_0005
Revises: 20260414_0004
Create Date: 2026-04-14 23:40:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260414_0005"
down_revision = "20260414_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system13_projects",
        sa.Column("id", sa.String(length=50), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("overview", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("tech_stack", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("members", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "system13_knowledge",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.String(length=50), sa.ForeignKey("system13_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="general"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("importance", sa.String(length=10), nullable=False, server_default="medium"),
        sa.Column("is_landmine", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("registered_by", sa.String(length=100), nullable=True),
        sa.Column("source_type", sa.String(length=20), nullable=False, server_default="official"),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system13_knowledge_project_id", "system13_knowledge", ["project_id"])
    op.create_index("idx_system13_knowledge_category", "system13_knowledge", ["category"])
    op.execute(
        "CREATE INDEX idx_system13_knowledge_embedding "
        "ON system13_knowledge USING ivfflat (embedding vector_cosine_ops)"
    )

    op.create_table(
        "system13_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(length=50), nullable=False),
        sa.Column("project_id", sa.String(length=50), sa.ForeignKey("system13_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=True),
        sa.Column("role", sa.String(length=50), nullable=True),
        sa.Column("joined_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("user_id", "project_id", name="uq_system13_members_user_project"),
    )

    op.create_table(
        "system13_sessions",
        sa.Column("session_id", sa.String(length=50), primary_key=True),
        sa.Column("project_id", sa.String(length=50), sa.ForeignKey("system13_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=50), nullable=False),
        sa.Column("history", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "system13_question_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.String(length=50), sa.ForeignKey("system13_sessions.session_id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.String(length=50), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("related_info", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("confidence", sa.String(length=10), nullable=True),
        sa.Column("escalation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("has_warning", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_answered", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system13_question_logs_project_id", "system13_question_logs", ["project_id"])
    op.create_index("idx_system13_question_logs_created_at", "system13_question_logs", ["created_at"])

    op.create_table(
        "system13_checklist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.String(length=50), sa.ForeignKey("system13_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=50), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("due_days", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system13_checklist_user_project", "system13_checklist_items", ["user_id", "project_id"])


def downgrade() -> None:
    op.drop_index("idx_system13_checklist_user_project", table_name="system13_checklist_items")
    op.drop_table("system13_checklist_items")
    op.drop_index("idx_system13_question_logs_created_at", table_name="system13_question_logs")
    op.drop_index("idx_system13_question_logs_project_id", table_name="system13_question_logs")
    op.drop_table("system13_question_logs")
    op.drop_table("system13_sessions")
    op.drop_table("system13_members")
    op.execute("DROP INDEX IF EXISTS idx_system13_knowledge_embedding")
    op.drop_index("idx_system13_knowledge_category", table_name="system13_knowledge")
    op.drop_index("idx_system13_knowledge_project_id", table_name="system13_knowledge")
    op.drop_table("system13_knowledge")
    op.drop_table("system13_projects")
