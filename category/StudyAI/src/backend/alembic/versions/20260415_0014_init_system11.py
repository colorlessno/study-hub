"""init system11 tables

Revision ID: 20260415_0014
Revises: 20260415_0013
Create Date: 2026-04-15 10:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260415_0014"
down_revision = "20260415_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plans",
        sa.Column("plan_id", sa.String(length=50), primary_key=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("actions_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("watch_folders", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("output_folder", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="created"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('created', 'approved', 'executed', 'cancelled')", name="chk_plans_status"),
    )
    op.create_index("idx_plans_created_at", "plans", ["created_at"])

    op.create_table(
        "executions",
        sa.Column("execution_id", sa.String(length=50), primary_key=True),
        sa.Column("plan_id", sa.String(length=50), sa.ForeignKey("plans.plan_id"), nullable=False),
        sa.Column("result", sa.String(length=20), nullable=False),
        sa.Column("rollback_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("success_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("executed_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("result IN ('success', 'partial', 'failed', 'rolled_back')", name="chk_executions_result"),
    )
    op.create_index("idx_executions_plan_id", "executions", ["plan_id"])
    op.create_index("idx_executions_executed_at", "executions", ["executed_at"])

    op.create_table(
        "execution_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("execution_id", sa.String(length=50), sa.ForeignKey("executions.execution_id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_type", sa.String(length=20), nullable=False),
        sa.Column("source_path", sa.Text(), nullable=False),
        sa.Column("target_path", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_code", sa.String(length=50), nullable=True),
        sa.Column("rollbackable", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("action_type IN ('move', 'rename', 'archive', 'keep')", name="chk_execution_items_action_type"),
        sa.CheckConstraint("status IN ('success', 'failed', 'skipped', 'conflict', 'locked', 'skipped_by_policy')", name="chk_execution_items_status"),
    )
    op.create_index("idx_execution_items_execution_id", "execution_items", ["execution_id"])
    op.create_index("idx_execution_items_status", "execution_items", ["status"])

    op.create_table(
        "organizer_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("watch_folders", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("output_folder", sa.Text(), nullable=True),
        sa.Column("exclude_patterns", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("mode", sa.String(length=20), nullable=False, server_default="preview"),
        sa.Column("schedule", sa.String(length=50), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("mode IN ('preview', 'execute')", name="chk_organizer_settings_mode"),
    )


def downgrade() -> None:
    op.drop_table("organizer_settings")
    op.drop_index("idx_execution_items_status", table_name="execution_items")
    op.drop_index("idx_execution_items_execution_id", table_name="execution_items")
    op.drop_table("execution_items")
    op.drop_index("idx_executions_executed_at", table_name="executions")
    op.drop_index("idx_executions_plan_id", table_name="executions")
    op.drop_table("executions")
    op.drop_index("idx_plans_created_at", table_name="plans")
    op.drop_table("plans")
