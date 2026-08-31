"""init system08 tables

Revision ID: 20260415_0008
Revises: 20260415_0007
Create Date: 2026-04-15 01:30:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260415_0008"
down_revision = "20260415_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system08_analyses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("theme", sa.Text(), nullable=False),
        sa.Column("background", sa.Text(), nullable=True),
        sa.Column("current_status", sa.Text(), nullable=True),
        sa.Column("constraints", sa.Text(), nullable=True),
        sa.Column("role", sa.String(length=100), nullable=True),
        sa.Column("depth", sa.String(length=20), nullable=True),
        sa.Column("output_format", sa.String(length=20), nullable=False, server_default="json"),
        sa.Column("search_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("search_queries", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("sources_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("priority_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("markdown", sa.Text(), nullable=True),
        sa.Column("total_tasks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_estimated_hours", sa.Numeric(precision=8, scale=1), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="created"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system08_analyses_created_at", "system08_analyses", ["created_at"])
    op.create_index("idx_system08_analyses_status", "system08_analyses", ["status"])

    op.create_table(
        "system08_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("analysis_id", sa.Integer(), sa.ForeignKey("system08_analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_no", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("priority", sa.String(length=10), nullable=False),
        sa.Column("urgency", sa.String(length=10), nullable=True),
        sa.Column("importance", sa.String(length=10), nullable=True),
        sa.Column("quadrant", sa.String(length=20), nullable=True),
        sa.Column("dependencies", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("estimated_hours", sa.Numeric(precision=8, scale=1), nullable=True),
        sa.Column("assignee_skill", sa.String(length=255), nullable=True),
        sa.Column("cautions", sa.Text(), nullable=True),
        sa.Column("references", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("confidence", sa.String(length=10), nullable=True),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="todo"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system08_tasks_analysis_id", "system08_tasks", ["analysis_id"])
    op.create_index("idx_system08_tasks_priority", "system08_tasks", ["priority"])
    op.create_index("idx_system08_tasks_status", "system08_tasks", ["status"])


def downgrade() -> None:
    op.drop_index("idx_system08_tasks_status", table_name="system08_tasks")
    op.drop_index("idx_system08_tasks_priority", table_name="system08_tasks")
    op.drop_index("idx_system08_tasks_analysis_id", table_name="system08_tasks")
    op.drop_table("system08_tasks")
    op.drop_index("idx_system08_analyses_status", table_name="system08_analyses")
    op.drop_index("idx_system08_analyses_created_at", table_name="system08_analyses")
    op.drop_table("system08_analyses")
