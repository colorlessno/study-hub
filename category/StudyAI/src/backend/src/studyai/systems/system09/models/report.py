from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from studyai.common.db.base import Base


class System09Report(Base):
    __tablename__ = "system09_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    research_type: Mapped[str] = mapped_column(String(50), nullable=False)
    theme: Mapped[str] = mapped_column(String(255), nullable=False)
    targets: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text)
    own_company: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    depth: Mapped[str] = mapped_column(String(20), nullable=False, default="standard")
    focus_areas: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    search_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    executive_summary: Mapped[str | None] = mapped_column(Text)
    key_findings: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    companies: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    comparison_table: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    swot: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    trends: Mapped[str | None] = mapped_column(Text)
    limitations: Mapped[str | None] = mapped_column(Text)
    markdown: Mapped[str | None] = mapped_column(Text)
    sources_json: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    query_log_json: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    target_normalized_key: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
