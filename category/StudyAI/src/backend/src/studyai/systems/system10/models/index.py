from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from studyai.common.db.base import Base
from studyai.common.db.types import Vector

SYSTEM10_EMBEDDING_DIMENSIONS = 768


class System10FileIndex(Base):
    __tablename__ = "system10_file_index"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    full_path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    folder_path: Mapped[str | None] = mapped_column(Text)
    file_hash: Mapped[str | None] = mapped_column(String(64))
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    doc_type: Mapped[str | None] = mapped_column(String(50))
    summary: Mapped[str | None] = mapped_column(Text)
    is_latest: Mapped[bool | None] = mapped_column(Boolean)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    scanned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(SYSTEM10_EMBEDDING_DIMENSIONS))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class System10ScanLog(Base):
    __tablename__ = "system10_scan_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_targets: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    scan_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    total_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    new_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deleted_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicates_found: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    executed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class System10DuplicateGroup(Base):
    __tablename__ = "system10_duplicate_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_ids: Mapped[list[int]] = mapped_column(JSONB, default=list, nullable=False)
    similarity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    similarity_score: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    latest_file_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
