from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base


class Plan(Base):
    __tablename__ = "plans"

    plan_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    summary: Mapped[str | None] = mapped_column(Text)
    actions_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    watch_folders: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    output_folder: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="created")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    executions: Mapped[list["Execution"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Execution(Base):
    __tablename__ = "executions"

    execution_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    plan_id: Mapped[str] = mapped_column(String(50), ForeignKey("plans.plan_id"), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    rollback_data: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    executed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    plan: Mapped["Plan"] = relationship(back_populates="executions")
    items: Mapped[list["ExecutionItem"]] = relationship(
        back_populates="execution",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ExecutionItem(Base):
    __tablename__ = "execution_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    execution_id: Mapped[str] = mapped_column(String(50), ForeignKey("executions.execution_id", ondelete="CASCADE"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source_path: Mapped[str] = mapped_column(Text, nullable=False)
    target_path: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(50))
    rollbackable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    execution: Mapped["Execution"] = relationship(back_populates="items")


class OrganizerSettings(Base):
    __tablename__ = "organizer_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    watch_folders: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    output_folder: Mapped[str | None] = mapped_column(Text)
    exclude_patterns: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="preview")
    schedule: Mapped[str | None] = mapped_column(String(50))
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
