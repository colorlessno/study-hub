from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base


class System04Analysis(Base):
    __tablename__ = "system04_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sentiment_summary: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    topics: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    insights: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    comparison_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    compare_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    review_results: Mapped[list["System04ReviewResult"]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class System04ReviewResult(Base):
    __tablename__ = "system04_review_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("system04_analyses.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_id: Mapped[str | None] = mapped_column(String(100))
    product_name: Mapped[str | None] = mapped_column(String(255))
    review_score: Mapped[float | None] = mapped_column(Numeric(2, 1))
    review_date: Mapped[date | None] = mapped_column(Date)
    review_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment: Mapped[str] = mapped_column(String(20), nullable=False)
    sentiment_score: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    intensity: Mapped[str] = mapped_column(String(10), nullable=False)
    topics: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    analysis: Mapped[System04Analysis] = relationship(back_populates="review_results")
