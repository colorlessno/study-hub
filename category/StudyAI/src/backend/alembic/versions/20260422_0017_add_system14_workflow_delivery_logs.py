"""add system14 workflow delivery logs

Revision ID: 20260422_0017
Revises: 20260421_0016
Create Date: 2026-04-22 09:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260422_0017"
down_revision = "20260421_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system14_workflow_delivery_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "workflow_id",
            sa.Integer(),
            sa.ForeignKey("system14_workflows.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("method", sa.String(length=20), nullable=False),
        sa.Column("destination", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "status IN ('success', 'failed', 'skipped')",
            name="chk_system14_workflow_delivery_logs_status",
        ),
    )
    op.create_index(
        "idx_system14_workflow_delivery_logs_workflow_id",
        "system14_workflow_delivery_logs",
        ["workflow_id"],
    )
    op.create_index(
        "idx_system14_workflow_delivery_logs_status",
        "system14_workflow_delivery_logs",
        ["status"],
    )
    op.create_index(
        "idx_system14_workflow_delivery_logs_created_at",
        "system14_workflow_delivery_logs",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_system14_workflow_delivery_logs_created_at", table_name="system14_workflow_delivery_logs")
    op.drop_index("idx_system14_workflow_delivery_logs_status", table_name="system14_workflow_delivery_logs")
    op.drop_index("idx_system14_workflow_delivery_logs_workflow_id", table_name="system14_workflow_delivery_logs")
    op.drop_table("system14_workflow_delivery_logs")
