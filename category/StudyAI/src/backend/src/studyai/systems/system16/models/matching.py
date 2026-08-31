from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from studyai.common.db.base import Base
from studyai.common.db.types import Vector

EMBEDDING_DIMENSIONS = 768


class System16MatchResult(Base):
    __tablename__ = "system16_match_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requirement_text: Mapped[str] = mapped_column(Text, nullable=False)
    candidate_data_masked: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    score: Mapped[float] = mapped_column(Numeric(5, 2, asdecimal=False), nullable=False)
    level: Mapped[str | None] = mapped_column(String(20))
    parse_confidence: Mapped[float | None] = mapped_column(Numeric(4, 3, asdecimal=False))
    review_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    review_reasons: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    score_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    report: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    similar_cases: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    bulk_id: Mapped[int | None] = mapped_column(Integer)
    candidate_id: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class System16BulkJob(Base):
    __tablename__ = "system16_bulk_jobs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    bulk_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    total_candidates: Mapped[int] = mapped_column(Integer, nullable=False)
    succeeded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)


class System16PastKnowledge(Base):
    __tablename__ = "system16_past_knowledge"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requirement_summary: Mapped[str] = mapped_column(Text, nullable=False)
    candidate_profile: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIMENSIONS))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class System16SkillAlias(Base):
    __tablename__ = "system16_skill_aliases"
    __table_args__ = (UniqueConstraint("alias_name", "category", name="uq_system16_skill_aliases_alias_category"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    canonical_name: Mapped[str] = mapped_column(String(100), nullable=False)
    alias_name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str | None] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
