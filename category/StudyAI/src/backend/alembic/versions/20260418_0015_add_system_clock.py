"""add system_clock table

Revision ID: 20260418_0015
Revises: 20260415_0014
Create Date: 2026-04-18 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260418_0015"
down_revision = "20260415_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_clock",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clock_date", sa.Date(), nullable=True),
        sa.Column("clock_datetime", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("note", sa.String(length=255), nullable=True),
    )
    # 単一レコードを初期挿入（全 NULL = 実時刻を使用）
    op.execute("INSERT INTO system_clock (clock_date, clock_datetime, note) VALUES (NULL, NULL, 'initial')")


def downgrade() -> None:
    op.drop_table("system_clock")
