"""add system14 dummy crm activities

Revision ID: 20260901_0019
Revises: 20260828_0018
Create Date: 2026-09-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260901_0019"
down_revision = "20260828_0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system14_dummy_crm_activities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.String(length=120), nullable=False, unique=True),
        sa.Column("customer_id", sa.String(length=100), nullable=True),
        sa.Column("customer_name", sa.String(length=200), nullable=True),
        sa.Column("contact_type", sa.String(length=50), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("sentiment", sa.String(length=20), nullable=True),
        sa.Column("urgency", sa.String(length=20), nullable=False, server_default="normal"),
        sa.Column("assigned_to", sa.String(length=100), nullable=True),
        sa.Column("next_action", sa.Text(), nullable=True),
        sa.Column("follow_up_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column(
            "source_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "status IN ('open', 'in_progress', 'completed')",
            name="chk_system14_dummy_crm_activities_status",
        ),
        sa.CheckConstraint(
            "urgency IN ('low', 'normal', 'high')",
            name="chk_system14_dummy_crm_activities_urgency",
        ),
        sa.CheckConstraint(
            "sentiment IS NULL OR sentiment IN ('positive', 'negative', 'neutral')",
            name="chk_system14_dummy_crm_activities_sentiment",
        ),
    )
    op.create_index(
        "idx_system14_dummy_crm_activities_status",
        "system14_dummy_crm_activities",
        ["status"],
    )
    op.create_index(
        "idx_system14_dummy_crm_activities_updated_at",
        "system14_dummy_crm_activities",
        ["updated_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "idx_system14_dummy_crm_activities_updated_at",
        table_name="system14_dummy_crm_activities",
    )
    op.drop_index(
        "idx_system14_dummy_crm_activities_status",
        table_name="system14_dummy_crm_activities",
    )
    op.drop_table("system14_dummy_crm_activities")
