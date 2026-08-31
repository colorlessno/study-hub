from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base
from studyai.common.db.types import Vector

EMBEDDING_DIMENSIONS = 768


class System14DataJob(Base):
    __tablename__ = "system14_data_jobs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    data_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    conversations: Mapped[list["System14Conversation"]] = relationship(
        back_populates="job",
        lazy="selectin",
    )


class System14Conversation(Base):
    __tablename__ = "system14_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str | None] = mapped_column(
        ForeignKey("system14_data_jobs.id", ondelete="SET NULL"),
    )
    data_type: Mapped[str | None] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    transcript: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    job: Mapped[System14DataJob | None] = relationship(back_populates="conversations")
    utterances: Mapped[list["System14Utterance"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    sales_scores: Mapped[list["System14SalesScore"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class System14Utterance(Base):
    __tablename__ = "system14_utterances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("system14_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    speaker: Mapped[str | None] = mapped_column(String(20))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment: Mapped[str] = mapped_column(String(20), nullable=False, default="neutral")
    sentiment_score: Mapped[float] = mapped_column(Numeric(3, 2, asdecimal=False), nullable=False, default=0.0)
    utterance_type: Mapped[str] = mapped_column(String(20), nullable=False, default="その他")
    topics: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    urgency: Mapped[str] = mapped_column(String(20), nullable=False, default="low")
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIMENSIONS))
    start_sec: Mapped[float | None] = mapped_column(Numeric(8, 2, asdecimal=False))
    end_sec: Mapped[float | None] = mapped_column(Numeric(8, 2, asdecimal=False))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    conversation: Mapped[System14Conversation] = relationship(back_populates="utterances")


class System14InsightGroup(Base):
    __tablename__ = "system14_insight_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    sentiment: Mapped[str | None] = mapped_column(String(20))
    utterance_type: Mapped[str | None] = mapped_column(String(20))
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    products: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    representative_text: Mapped[str | None] = mapped_column(Text)
    period_from: Mapped[date | None] = mapped_column(Date)
    period_to: Mapped[date | None] = mapped_column(Date)
    utterance_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


class System14SalesScore(Base):
    __tablename__ = "system14_sales_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("system14_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    staff_id: Mapped[str | None] = mapped_column(String(50))
    staff_name: Mapped[str | None] = mapped_column(String(100))
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    issue_exploration: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    proposal_quality: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_step_clarity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    listening_ratio: Mapped[float] = mapped_column(Numeric(3, 2, asdecimal=False), nullable=False, default=0.0)
    top_questions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    conversation: Mapped[System14Conversation] = relationship(back_populates="sales_scores")


class System14Workflow(Base):
    __tablename__ = "system14_workflows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    data_sources: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    analysis_steps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    output_type: Mapped[str | None] = mapped_column(String(50))
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    delivery: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    delivery_logs: Mapped[list["System14WorkflowDeliveryLog"]] = relationship(
        back_populates="workflow",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class System14WorkflowDeliveryLog(Base):
    __tablename__ = "system14_workflow_delivery_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workflow_id: Mapped[int] = mapped_column(
        ForeignKey("system14_workflows.id", ondelete="CASCADE"),
        nullable=False,
    )
    method: Mapped[str] = mapped_column(String(20), nullable=False)
    destination: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    response_json: Mapped[dict] = mapped_column("response", JSONB, nullable=False, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    workflow: Mapped[System14Workflow] = relationship(back_populates="delivery_logs")


class System14AgentAnswer(Base):
    __tablename__ = "system14_agent_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str | None] = mapped_column(String(80))
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    recommended_actions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    evidence: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    related_links: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
