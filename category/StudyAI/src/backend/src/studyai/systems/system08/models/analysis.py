from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base


class System08Analysis(Base):
    __tablename__ = "system08_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    theme: Mapped[str] = mapped_column(Text, nullable=False)
    background: Mapped[str | None] = mapped_column(Text)
    current_status: Mapped[str | None] = mapped_column(Text)
    constraints: Mapped[str | None] = mapped_column(Text)
    role: Mapped[str | None] = mapped_column(String(100))
    depth: Mapped[str | None] = mapped_column(String(20))
    output_format: Mapped[str] = mapped_column(String(20), nullable=False, default="json")
    search_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    search_queries: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    sources_json: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    priority_summary: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    markdown: Mapped[str | None] = mapped_column(Text)
    total_tasks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_estimated_hours: Mapped[float] = mapped_column(Numeric(8, 1), nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="created")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    tasks: Mapped[list["System08Task"]] = relationship(
        back_populates="analysis",
        lazy="selectin",
        cascade="all, delete-orphan",
    )


class System08Task(Base):
    __tablename__ = "system08_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("system08_analyses.id", ondelete="CASCADE"),
        nullable=False,
    )
    task_no: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    priority: Mapped[str] = mapped_column(String(10), nullable=False)
    urgency: Mapped[str | None] = mapped_column(String(10))
    importance: Mapped[str | None] = mapped_column(String(10))
    quadrant: Mapped[str | None] = mapped_column(String(20))
    dependencies: Mapped[list[int]] = mapped_column(JSONB, default=list, nullable=False)
    estimated_hours: Mapped[float | None] = mapped_column(Numeric(8, 1))
    assignee_skill: Mapped[str | None] = mapped_column(String(255))
    cautions: Mapped[str | None] = mapped_column(Text)
    references: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    confidence: Mapped[str | None] = mapped_column(String(10))
    evidence: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="todo")
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    analysis: Mapped[System08Analysis] = relationship(back_populates="tasks")
