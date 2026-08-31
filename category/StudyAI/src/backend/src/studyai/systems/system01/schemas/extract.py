from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BankInfoSchema(BaseModel):
    bank_name: str | None = None
    branch_name: str | None = None
    account_type: str | None = None
    account_number: str | None = None


class DocumentItemSchema(BaseModel):
    name: str | None = None
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    amount: Decimal | None = None


class ExtractResultPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_type: str | None = None
    issue_date: date | None = None
    supplier_name: str | None = None
    supplier_address: str | None = None
    recipient_name: str | None = None
    items: list[DocumentItemSchema] = Field(default_factory=list)
    subtotal: Decimal | None = None
    tax_8: Decimal | None = None
    tax_10: Decimal | None = None
    total: Decimal | None = None
    payment_due: date | None = None
    bank_info: BankInfoSchema | None = None
    invoice_number: str | None = None


class ExtractResponse(ExtractResultPayload):
    document_id: int
    confidence_score: Decimal
    requires_review: bool
    review_status: str
    business_duplicate_suspected: bool
    missing_fields: list[str]


class BulkExtractAcceptedResponse(BaseModel):
    job_id: str
    total_files: int
    status: str
    results_endpoint: str


class BulkJobResultResponse(BaseModel):
    file_name: str
    status: str
    document_id: int | None = None
    confidence_score: Decimal | None = None
    requires_review: bool | None = None
    missing_fields: list[str] | None = None
    error: str | None = None
    message: str | None = None


class BulkJobStatusResponse(BaseModel):
    job_id: str
    status: str
    total_files: int
    succeeded: int
    failed: int
    results: list[BulkJobResultResponse]


class CorrectionRequest(BaseModel):
    document_type: str | None = None
    issue_date: date | None = None
    supplier_name: str | None = None
    supplier_address: str | None = None
    recipient_name: str | None = None
    items: list[DocumentItemSchema] | None = None
    subtotal: Decimal | None = None
    tax_8: Decimal | None = None
    tax_10: Decimal | None = None
    total: Decimal | None = None
    payment_due: date | None = None
    bank_info: BankInfoSchema | None = None
    invoice_number: str | None = None
    review_status: Literal["未確認", "確認済み"] | None = None
    corrected_fields: list[str] = Field(default_factory=list)


class CorrectionResponse(BaseModel):
    document_id: int
    updated_fields: list[str]
    confidence_score: Decimal
    missing_fields: list[str]
    requires_review: bool
    review_status: Literal["未確認", "確認済み"]
    updated_at: datetime


class DocumentListItemResponse(BaseModel):
    document_id: int
    file_name: str
    document_type: str | None = None
    issue_date: date | None = None
    supplier_name: str | None = None
    tax_8: Decimal | None = None
    tax_10: Decimal | None = None
    total: Decimal | None = None
    payment_due: date | None = None
    invoice_number: str | None = None
    confidence_score: Decimal
    requires_review: bool
    review_status: Literal["未確認", "確認済み"]
    missing_fields: list[str]
    created_at: datetime


class DocumentListResponse(BaseModel):
    total: int
    page: int
    per_page: int
    items: list[DocumentListItemResponse]
