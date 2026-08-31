from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    document_type: Mapped[str | None] = mapped_column(String(20))
    issue_date: Mapped[date | None] = mapped_column(Date)
    supplier_name: Mapped[str | None] = mapped_column(String(255))
    supplier_address: Mapped[str | None] = mapped_column(Text)
    recipient_name: Mapped[str | None] = mapped_column(String(255))
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    tax_8: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    tax_10: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    total: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    payment_due: Mapped[date | None] = mapped_column(Date)
    bank_info: Mapped[dict | None] = mapped_column(JSONB)
    invoice_number: Mapped[str | None] = mapped_column(String(20))
    confidence_score: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("0.00"))
    requires_review: Mapped[bool] = mapped_column(Boolean, default=False)
    review_status: Mapped[str] = mapped_column(String(20), default="未確認")
    business_duplicate_suspected: Mapped[bool] = mapped_column(Boolean, default=False)
    missing_fields: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    items: Mapped[list["DocumentItem"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class DocumentItem(Base):
    __tablename__ = "document_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))

    document: Mapped[Document] = relationship(back_populates="items")


class ExtractJob(Base):
    __tablename__ = "extract_jobs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    total_files: Mapped[int] = mapped_column(Integer, nullable=False)
    succeeded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    results: Mapped[list["ExtractJobResult"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ExtractJobResult(Base):
    __tablename__ = "extract_job_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("extract_jobs.id", ondelete="CASCADE"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id"))
    error_code: Mapped[str | None] = mapped_column(String(50))
    message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    job: Mapped[ExtractJob] = relationship(back_populates="results")


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_msg: Mapped[str | None] = mapped_column(Text)
    processed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
