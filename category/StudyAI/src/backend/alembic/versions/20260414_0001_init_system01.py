"""init system01 tables

Revision ID: 20260414_0001
Revises:
Create Date: 2026-04-14 14:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260414_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("document_type", sa.String(length=20), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("supplier_name", sa.String(length=255), nullable=True),
        sa.Column("supplier_address", sa.Text(), nullable=True),
        sa.Column("recipient_name", sa.String(length=255), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 0), nullable=True),
        sa.Column("tax_8", sa.Numeric(12, 0), nullable=True),
        sa.Column("tax_10", sa.Numeric(12, 0), nullable=True),
        sa.Column("total", sa.Numeric(12, 0), nullable=True),
        sa.Column("payment_due", sa.Date(), nullable=True),
        sa.Column("bank_info", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("invoice_number", sa.String(length=20), nullable=True),
        sa.Column("confidence_score", sa.Numeric(3, 2), nullable=False, server_default="0.00"),
        sa.Column("requires_review", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("review_status", sa.String(length=20), nullable=False, server_default="未確認"),
        sa.Column("business_duplicate_suspected", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("missing_fields", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_documents_issue_date", "documents", ["issue_date"])
    op.create_index("idx_documents_supplier_name", "documents", ["supplier_name"])
    op.create_index("idx_documents_total", "documents", ["total"])
    op.create_index("idx_documents_created_at", "documents", ["created_at"])

    op.create_table(
        "document_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=True),
        sa.Column("unit_price", sa.Numeric(12, 0), nullable=True),
        sa.Column("amount", sa.Numeric(12, 0), nullable=True),
    )
    op.create_index("idx_document_items_document_id", "document_items", ["document_id"])

    op.create_table(
        "extract_jobs",
        sa.Column("id", sa.String(length=50), primary_key=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("total_files", sa.Integer(), nullable=False),
        sa.Column("succeeded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "extract_job_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.String(length=50), sa.ForeignKey("extract_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id"), nullable=True),
        sa.Column("error_code", sa.String(length=50), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_extract_job_results_job_id", "extract_job_results", ["job_id"])

    op.create_table(
        "processing_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_msg", sa.Text(), nullable=True),
        sa.Column("processed_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_processing_logs_processed_at", "processing_logs", ["processed_at"])


def downgrade() -> None:
    op.drop_index("idx_processing_logs_processed_at", table_name="processing_logs")
    op.drop_table("processing_logs")
    op.drop_index("idx_extract_job_results_job_id", table_name="extract_job_results")
    op.drop_table("extract_job_results")
    op.drop_table("extract_jobs")
    op.drop_index("idx_document_items_document_id", table_name="document_items")
    op.drop_table("document_items")
    op.drop_index("idx_documents_created_at", table_name="documents")
    op.drop_index("idx_documents_total", table_name="documents")
    op.drop_index("idx_documents_supplier_name", table_name="documents")
    op.drop_index("idx_documents_issue_date", table_name="documents")
    op.drop_table("documents")
