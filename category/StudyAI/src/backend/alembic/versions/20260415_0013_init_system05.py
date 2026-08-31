"""init system05 tables

Revision ID: 20260415_0013
Revises: 20260415_0012
Create Date: 2026-04-15 05:30:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260415_0013"
down_revision = "20260415_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system05_patients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("name_kana", sa.String(length=100), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("occupation", sa.String(length=100), nullable=True),
        sa.Column("contraindications", sa.Text(), nullable=True),
        sa.Column("therapist_name", sa.String(length=100), nullable=True),
        sa.Column("visit_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system05_patients_name", "system05_patients", ["name"])
    op.create_index("idx_system05_patients_phone", "system05_patients", ["phone"])
    op.create_index("idx_system05_patients_visit_count", "system05_patients", ["visit_count"])

    op.create_table(
        "system05_treatment_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("system05_patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("menu", sa.String(length=100), nullable=False),
        sa.Column("fee", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("soap_subjective", sa.Text(), nullable=False),
        sa.Column("soap_objective", sa.Text(), nullable=False),
        sa.Column("soap_assessment", sa.Text(), nullable=False),
        sa.Column("soap_plan", sa.Text(), nullable=False),
        sa.Column("suggestion_memo", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=100), nullable=True),
        sa.Column("updated_by", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system05_records_patient_id", "system05_treatment_records", ["patient_id"])
    op.create_index("idx_system05_records_session_date", "system05_treatment_records", ["session_date"])

    op.create_table(
        "system05_record_revisions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("record_id", sa.Integer(), sa.ForeignKey("system05_treatment_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("before_record", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("after_record", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("updated_by", sa.String(length=100), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("record_id", "revision_no", name="uq_system05_record_revision_no"),
    )
    op.create_index("idx_system05_revisions_record_id", "system05_record_revisions", ["record_id"])
    op.create_index("idx_system05_revisions_updated_at", "system05_record_revisions", ["updated_at"])

    op.create_table(
        "system05_appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("system05_patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("menu", sa.String(length=100), nullable=False),
        sa.Column("therapist_name", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.Column("channel", sa.String(length=20), nullable=False, server_default="staff"),
        sa.Column("confirmation_code", sa.String(length=50), nullable=True),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system05_appointments_patient_id", "system05_appointments", ["patient_id"])
    op.create_index("idx_system05_appointments_start_time", "system05_appointments", ["start_time"])
    op.create_index("idx_system05_appointments_status", "system05_appointments", ["status"])

    op.create_table(
        "system05_backup_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("archive_path", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("idx_system05_backup_logs_started_at", "system05_backup_logs", ["started_at"])

    op.create_table(
        "system05_access_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_role", sa.String(length=20), nullable=False),
        sa.Column("actor_id", sa.String(length=100), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("target_type", sa.String(length=50), nullable=False),
        sa.Column("target_id", sa.String(length=100), nullable=True),
        sa.Column("result", sa.String(length=20), nullable=False),
        sa.Column("detail", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_system05_audit_logs_created_at", "system05_access_audit_logs", ["created_at"])
    op.create_index("idx_system05_audit_logs_target", "system05_access_audit_logs", ["target_type", "target_id"])


def downgrade() -> None:
    op.drop_index("idx_system05_audit_logs_target", table_name="system05_access_audit_logs")
    op.drop_index("idx_system05_audit_logs_created_at", table_name="system05_access_audit_logs")
    op.drop_table("system05_access_audit_logs")
    op.drop_index("idx_system05_backup_logs_started_at", table_name="system05_backup_logs")
    op.drop_table("system05_backup_logs")
    op.drop_index("idx_system05_appointments_status", table_name="system05_appointments")
    op.drop_index("idx_system05_appointments_start_time", table_name="system05_appointments")
    op.drop_index("idx_system05_appointments_patient_id", table_name="system05_appointments")
    op.drop_table("system05_appointments")
    op.drop_index("idx_system05_revisions_updated_at", table_name="system05_record_revisions")
    op.drop_index("idx_system05_revisions_record_id", table_name="system05_record_revisions")
    op.drop_table("system05_record_revisions")
    op.drop_index("idx_system05_records_session_date", table_name="system05_treatment_records")
    op.drop_index("idx_system05_records_patient_id", table_name="system05_treatment_records")
    op.drop_table("system05_treatment_records")
    op.drop_index("idx_system05_patients_visit_count", table_name="system05_patients")
    op.drop_index("idx_system05_patients_phone", table_name="system05_patients")
    op.drop_index("idx_system05_patients_name", table_name="system05_patients")
    op.drop_table("system05_patients")
