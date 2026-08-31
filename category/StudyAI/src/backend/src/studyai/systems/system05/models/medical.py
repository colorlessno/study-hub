from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from studyai.common.db.base import Base


class System05Patient(Base):
    __tablename__ = "system05_patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_kana: Mapped[str | None] = mapped_column(String(100))
    birth_date: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    occupation: Mapped[str | None] = mapped_column(String(100))
    contraindications: Mapped[str | None] = mapped_column(Text)
    therapist_name: Mapped[str | None] = mapped_column(String(100))
    visit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    records: Mapped[list["System05TreatmentRecord"]] = relationship(
        back_populates="patient",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    appointments: Mapped[list["System05Appointment"]] = relationship(
        back_populates="patient",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class System05TreatmentRecord(Base):
    __tablename__ = "system05_treatment_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("system05_patients.id", ondelete="CASCADE"), nullable=False)
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    menu: Mapped[str] = mapped_column(String(100), nullable=False)
    fee: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    soap_subjective: Mapped[str] = mapped_column(Text, nullable=False)
    soap_objective: Mapped[str] = mapped_column(Text, nullable=False)
    soap_assessment: Mapped[str] = mapped_column(Text, nullable=False)
    soap_plan: Mapped[str] = mapped_column(Text, nullable=False)
    suggestion_memo: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(100))
    updated_by: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    patient: Mapped[System05Patient] = relationship(back_populates="records")
    revisions: Mapped[list["System05RecordRevision"]] = relationship(
        back_populates="record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class System05RecordRevision(Base):
    __tablename__ = "system05_record_revisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    record_id: Mapped[int] = mapped_column(
        ForeignKey("system05_treatment_records.id", ondelete="CASCADE"),
        nullable=False,
    )
    revision_no: Mapped[int] = mapped_column(Integer, nullable=False)
    before_record: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    after_record: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    updated_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    record: Mapped[System05TreatmentRecord] = relationship(back_populates="revisions")


class System05Appointment(Base):
    __tablename__ = "system05_appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("system05_patients.id", ondelete="CASCADE"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    menu: Mapped[str] = mapped_column(String(100), nullable=False)
    therapist_name: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    channel: Mapped[str] = mapped_column(String(20), nullable=False, default="staff")
    confirmation_code: Mapped[str | None] = mapped_column(String(50))
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    patient: Mapped[System05Patient] = relationship(back_populates="appointments")


class System05BackupLog(Base):
    __tablename__ = "system05_backup_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    archive_path: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)


class System05AccessAuditLog(Base):
    __tablename__ = "system05_access_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[str | None] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    detail: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
