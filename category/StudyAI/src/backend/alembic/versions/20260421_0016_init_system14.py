"""init system14 tables

Revision ID: 20260421_0016
Revises: 20260418_0015
Create Date: 2026-04-21 10:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from studyai.common.db.types import Vector

revision = "20260421_0016"
down_revision = "20260418_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system14_data_jobs",
        sa.Column("id", sa.String(length=50), primary_key=True),
        sa.Column("data_type", sa.String(length=20), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("status IN ('queued', 'running', 'completed', 'failed')", name="chk_system14_data_jobs_status"),
    )
    op.create_index("idx_system14_data_jobs_created_at", "system14_data_jobs", ["created_at"])
    op.create_index("idx_system14_data_jobs_status", "system14_data_jobs", ["status"])
    op.create_index("idx_system14_data_jobs_source", "system14_data_jobs", ["source"])

    op.create_table(
        "system14_conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.String(length=50), sa.ForeignKey("system14_data_jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("data_type", sa.String(length=20), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("occurred_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system14_conversations_job_id", "system14_conversations", ["job_id"])
    op.create_index("idx_system14_conversations_source", "system14_conversations", ["source"])
    op.create_index("idx_system14_conversations_occurred_at", "system14_conversations", ["occurred_at"])

    op.create_table(
        "system14_utterances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("system14_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("speaker", sa.String(length=20), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("sentiment", sa.String(length=20), nullable=False, server_default="neutral"),
        sa.Column("sentiment_score", sa.Numeric(3, 2), nullable=False, server_default="0"),
        sa.Column("utterance_type", sa.String(length=20), nullable=False, server_default="その他"),
        sa.Column("topics", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("urgency", sa.String(length=20), nullable=False, server_default="low"),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("start_sec", sa.Numeric(8, 2), nullable=True),
        sa.Column("end_sec", sa.Numeric(8, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("sentiment IN ('positive', 'negative', 'neutral')", name="chk_system14_utterances_sentiment"),
    )
    op.create_index("idx_system14_utterances_conversation_id", "system14_utterances", ["conversation_id"])
    op.create_index("idx_system14_utterances_sentiment", "system14_utterances", ["sentiment"])
    op.create_index("idx_system14_utterances_type", "system14_utterances", ["utterance_type"])
    op.execute(
        "CREATE INDEX idx_system14_utterances_embedding "
        "ON system14_utterances USING ivfflat (embedding vector_cosine_ops)"
    )

    op.create_table(
        "system14_insight_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("sentiment", sa.String(length=20), nullable=True),
        sa.Column("utterance_type", sa.String(length=20), nullable=True),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("products", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("representative_text", sa.Text(), nullable=True),
        sa.Column("period_from", sa.Date(), nullable=True),
        sa.Column("period_to", sa.Date(), nullable=True),
        sa.Column("utterance_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system14_insight_groups_period", "system14_insight_groups", ["period_from", "period_to"])
    op.create_index("idx_system14_insight_groups_sentiment", "system14_insight_groups", ["sentiment"])
    op.create_index("idx_system14_insight_groups_type", "system14_insight_groups", ["utterance_type"])

    op.create_table(
        "system14_sales_scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("system14_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("staff_id", sa.String(length=50), nullable=True),
        sa.Column("staff_name", sa.String(length=100), nullable=True),
        sa.Column("overall_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("issue_exploration", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("proposal_quality", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_step_clarity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("listening_ratio", sa.Numeric(3, 2), nullable=False, server_default="0"),
        sa.Column("top_questions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("listening_ratio BETWEEN 0 AND 1", name="chk_system14_sales_scores_listening_ratio"),
    )
    op.create_index("idx_system14_sales_scores_conversation_id", "system14_sales_scores", ["conversation_id"])
    op.create_index("idx_system14_sales_scores_staff_id", "system14_sales_scores", ["staff_id"])

    op.create_table(
        "system14_workflows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("trigger", sa.String(length=20), nullable=False, server_default="manual"),
        sa.Column("data_sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("analysis_steps", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("output_type", sa.String(length=50), nullable=True),
        sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("delivery", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system14_workflows_is_active", "system14_workflows", ["is_active"])

    op.create_table(
        "system14_agent_answers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.String(length=80), nullable=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("recommended_actions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("related_links", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system14_agent_answers_session_id", "system14_agent_answers", ["session_id"])
    op.create_index("idx_system14_agent_answers_created_at", "system14_agent_answers", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_system14_agent_answers_created_at", table_name="system14_agent_answers")
    op.drop_index("idx_system14_agent_answers_session_id", table_name="system14_agent_answers")
    op.drop_table("system14_agent_answers")
    op.drop_index("idx_system14_workflows_is_active", table_name="system14_workflows")
    op.drop_table("system14_workflows")
    op.drop_index("idx_system14_sales_scores_staff_id", table_name="system14_sales_scores")
    op.drop_index("idx_system14_sales_scores_conversation_id", table_name="system14_sales_scores")
    op.drop_table("system14_sales_scores")
    op.drop_index("idx_system14_insight_groups_type", table_name="system14_insight_groups")
    op.drop_index("idx_system14_insight_groups_sentiment", table_name="system14_insight_groups")
    op.drop_index("idx_system14_insight_groups_period", table_name="system14_insight_groups")
    op.drop_table("system14_insight_groups")
    op.execute("DROP INDEX IF EXISTS idx_system14_utterances_embedding")
    op.drop_index("idx_system14_utterances_type", table_name="system14_utterances")
    op.drop_index("idx_system14_utterances_sentiment", table_name="system14_utterances")
    op.drop_index("idx_system14_utterances_conversation_id", table_name="system14_utterances")
    op.drop_table("system14_utterances")
    op.drop_index("idx_system14_conversations_occurred_at", table_name="system14_conversations")
    op.drop_index("idx_system14_conversations_source", table_name="system14_conversations")
    op.drop_index("idx_system14_conversations_job_id", table_name="system14_conversations")
    op.drop_table("system14_conversations")
    op.drop_index("idx_system14_data_jobs_source", table_name="system14_data_jobs")
    op.drop_index("idx_system14_data_jobs_status", table_name="system14_data_jobs")
    op.drop_index("idx_system14_data_jobs_created_at", table_name="system14_data_jobs")
    op.drop_table("system14_data_jobs")
