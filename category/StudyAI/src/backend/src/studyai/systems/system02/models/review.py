from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base


class System02ContractReview(Base):
    __tablename__ = "system02_contract_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_name: Mapped[str | None] = mapped_column(String(255))
    file_hash: Mapped[str | None] = mapped_column(String(64))
    file_hash_b: Mapped[str | None] = mapped_column(String(64))
    document_type: Mapped[str | None] = mapped_column(String(50))
    perspective: Mapped[str | None] = mapped_column(String(30))
    overall_risk: Mapped[str | None] = mapped_column(String(20))
    recommendation: Mapped[str | None] = mapped_column(String(30))
    summary: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    total_issues: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    compare_payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    issues: Mapped[list["System02ContractIssue"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class System02ContractIssue(Base):
    __tablename__ = "system02_contract_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(
        ForeignKey("system02_contract_reviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    issue_type: Mapped[str] = mapped_column(String(30), nullable=False)
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    article: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    risk_explanation: Mapped[str | None] = mapped_column(Text)
    suggested_text: Mapped[str | None] = mapped_column(Text)
    original_text: Mapped[str | None] = mapped_column(Text)
    position_start: Mapped[int | None] = mapped_column(Integer)
    position_end: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    review: Mapped[System02ContractReview] = relationship(back_populates="issues")
