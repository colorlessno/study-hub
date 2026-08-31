from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base
from studyai.common.db.types import Vector

SYSTEM07_EMBEDDING_DIMENSIONS = 768


class System07Document(Base):
    __tablename__ = "system07_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255))
    file_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    category: Mapped[str | None] = mapped_column(String(50))
    sub_category: Mapped[str | None] = mapped_column(String(50))
    document_type: Mapped[str | None] = mapped_column(String(50))
    importance: Mapped[str | None] = mapped_column(String(10))
    summary: Mapped[str | None] = mapped_column(Text)
    registered_by: Mapped[str] = mapped_column(String(100), nullable=False)
    access_roles: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    chunks: Mapped[list["System07DocumentChunk"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    tags: Mapped[list["System07DocumentTag"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    access_logs: Mapped[list["System07AccessLog"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class System07DocumentChunk(Base):
    __tablename__ = "system07_document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("system07_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_no: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    section: Mapped[str | None] = mapped_column(String(255))
    embedding: Mapped[list[float] | None] = mapped_column(Vector(SYSTEM07_EMBEDDING_DIMENSIONS))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    document: Mapped[System07Document] = relationship(back_populates="chunks")


class System07Tag(Base):
    __tablename__ = "system07_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    normalized_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    synonyms: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    use_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    merged_to_tag_id: Mapped[int | None] = mapped_column(ForeignKey("system07_tags.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    merged_to_tag: Mapped["System07Tag | None"] = relationship(
        remote_side="System07Tag.id",
        lazy="joined",
    )


class System07DocumentTag(Base):
    __tablename__ = "system07_document_tags"

    document_id: Mapped[int] = mapped_column(ForeignKey("system07_documents.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("system07_tags.id", ondelete="CASCADE"), primary_key=True)
    is_auto: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    document: Mapped[System07Document] = relationship(back_populates="tags")
    tag: Mapped[System07Tag] = relationship(lazy="joined")


class System07AccessLog(Base):
    __tablename__ = "system07_access_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("system07_documents.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    query: Mapped[str | None] = mapped_column(Text)
    accessed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    document: Mapped[System07Document] = relationship(back_populates="access_logs")
