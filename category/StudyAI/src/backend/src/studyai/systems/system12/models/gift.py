from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base
from studyai.common.db.types import Vector

EMBEDDING_DIMENSIONS = 768


class System12Product(Base):
    __tablename__ = "system12_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    price: Mapped[float] = mapped_column(Numeric(10, 0), nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    suitable_scenes: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    suitable_recipients: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    formality: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    purchase_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIMENSIONS))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class System12Scene(Base):
    __tablename__ = "system12_scenes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    formality: Mapped[int | None] = mapped_column(Integer)
    timing: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class System12Recipient(Base):
    __tablename__ = "system12_recipients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    formality: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class System12NgRule(Base):
    __tablename__ = "system12_ng_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scene_id: Mapped[int | None] = mapped_column(
        ForeignKey("system12_scenes.id", ondelete="CASCADE"),
        nullable=True,
    )
    recipient_id: Mapped[int | None] = mapped_column(
        ForeignKey("system12_recipients.id", ondelete="CASCADE"),
        nullable=True,
    )
    ng_attribute: Mapped[str] = mapped_column(String(100), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(10), nullable=False, default="warn")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    scene: Mapped[System12Scene | None] = relationship(lazy="joined")
    recipient: Mapped[System12Recipient | None] = relationship(lazy="joined")


class System12Session(Base):
    __tablename__ = "system12_sessions"

    session_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    collected_conditions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    recommended_ids: Mapped[list[int]] = mapped_column(JSONB, default=list, nullable=False)
    history: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    recommendation_logs: Mapped[list["System12RecommendationLog"]] = relationship(
        back_populates="session",
        lazy="selectin",
    )


class System12RecommendationLog(Base):
    __tablename__ = "system12_recommendation_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("system12_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
    )
    conditions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    recommended: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    feedback: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    session: Mapped[System12Session] = relationship(back_populates="recommendation_logs")
