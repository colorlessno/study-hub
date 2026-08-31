from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from studyai.common.db.base import Base
from studyai.common.db.types import Vector

EMBEDDING_DIMENSIONS = 768


class System06Session(Base):
    __tablename__ = "system06_sessions"

    session_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(50))
    history_json: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class System06Inquiry(Base):
    __tablename__ = "system06_inquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str | None] = mapped_column(
        ForeignKey("system06_sessions.session_id", ondelete="SET NULL"),
        nullable=True,
    )
    user_id: Mapped[str | None] = mapped_column(String(50))
    channel: Mapped[str] = mapped_column(String(20), nullable=False, default="form")
    order_id: Mapped[str | None] = mapped_column(String(100))
    member_id: Mapped[str | None] = mapped_column(String(100))
    message_masked: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    priority: Mapped[str | None] = mapped_column(String(10))
    confidence: Mapped[str | None] = mapped_column(String(10))
    response_type: Mapped[str | None] = mapped_column(String(20))
    response_message: Mapped[str | None] = mapped_column(Text)
    response_sources: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    next_actions: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    is_resolved: Mapped[bool | None] = mapped_column(Boolean)
    rating: Mapped[int | None] = mapped_column(Integer)
    feedback_comment: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    assignee: Mapped[str | None] = mapped_column(String(255))
    resolution: Mapped[str | None] = mapped_column(Text)
    escalated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    escalation_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class System06Faq(Base):
    __tablename__ = "system06_faqs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    faq_no: Mapped[str | None] = mapped_column(String(30), unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIMENSIONS))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    use_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class System06Escalation(Base):
    __tablename__ = "system06_escalations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inquiry_id: Mapped[int] = mapped_column(
        ForeignKey("system06_inquiries.id", ondelete="CASCADE"),
        nullable=False,
    )
    assignee: Mapped[str | None] = mapped_column(String(255))
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str | None] = mapped_column(Text)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime)
    handled_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
