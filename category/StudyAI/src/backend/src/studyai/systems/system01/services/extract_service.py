from __future__ import annotations

import time
import uuid
from decimal import Decimal

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.llm_client import LLMClient
from studyai.common.ai.models import JSONExtractionResult
from studyai.common.ai.vlm_client import VLMClient
from studyai.common.errors.models import ConflictAppError
from studyai.systems.system01.prompts.extract_prompt import build_extract_prompts
from studyai.systems.system01.repositories.document_repository import DocumentRepository
from studyai.systems.system01.repositories.log_repository import LogRepository
from studyai.systems.system01.schemas.extract import (
    CorrectionRequest,
    CorrectionResponse,
    DocumentListItemResponse,
    DocumentListResponse,
    ExtractResponse,
    ExtractResultPayload,
)
from studyai.systems.system01.services.file_processor import FileProcessor
from studyai.systems.system01.utils.mlflow_tracer import ExtractionTrace, MLflowTracer


class ExtractService:
    REQUIRED_FIELDS = ("document_type", "issue_date", "supplier_name", "total")
    OPTIONAL_FIELDS = ("items", "tax_8", "tax_10", "payment_due", "bank_info", "invoice_number")

    def __init__(self) -> None:
        self.file_processor = FileProcessor()
        self.llm_client = LLMClient()
        self.vlm_client = VLMClient()
        self.mlflow_tracer = MLflowTracer()

    async def run_single_extract(
        self,
        session: AsyncSession,
        upload_file,
        *,
        trace_id: str | None = None,
    ) -> ExtractResponse:
        self.file_processor.validate_file_name(upload_file.filename)
        file_bytes = await self.file_processor.read_upload(upload_file)
        return await self.run_single_extract_bytes(
            session,
            upload_file.filename,
            file_bytes,
            trace_id=trace_id,
        )

    async def run_single_extract_bytes(
        self,
        session: AsyncSession,
        file_name: str,
        file_bytes: bytes,
        *,
        trace_id: str | None = None,
        job_id: str | None = None,
        retry_count: int = 0,
    ) -> ExtractResponse:
        resolved_trace_id = trace_id or str(uuid.uuid4())
        started_at = time.perf_counter()
        input_type = "unknown"
        model_used = "unknown"
        model_result: JSONExtractionResult | None = None
        try:
            self.file_processor.validate_file_name(file_name)
            file_hash = self.file_processor.compute_hash(file_bytes)

            repository = DocumentRepository(session)
            existing = await repository.get_by_hash(file_hash)
            if existing is not None:
                raise ConflictAppError(
                    "duplicate_file",
                    "このファイルは既に登録されています。",
                    {"existing_id": existing.id},
                )

            input_type, text_content = self.file_processor.detect_input_type(file_name, file_bytes)
            model_used = self.llm_client.settings.get_llm_model() if input_type == "pdf_text" else self.vlm_client.settings.get_vlm_model()
            model_result = await self._run_model(input_type, file_name, text_content, file_bytes)
            payload = ExtractResultPayload.model_validate(model_result.data)
            derived = self._calculate_derived_values(payload)

            document = await repository.create_document(
                file_name,
                file_hash,
                payload,
                derived["confidence_score"],
                derived["requires_review"],
                derived["missing_fields"],
            )
            await LogRepository(session).insert(file_name, "success")
            await session.commit()
        except Exception as exc:
            await session.rollback()
            await LogRepository(session).insert(file_name, "error", str(exc))
            await session.commit()
            error_details = getattr(exc, "details", {})
            is_validation_failure = (
                isinstance(exc, ValidationError)
                or getattr(exc, "error_code", "") == "invalid_model_output"
            )
            raw_output = error_details.get("raw_output") if is_validation_failure else None
            if is_validation_failure and raw_output is None and model_result is not None:
                raw_output = model_result.raw_output
            await self.mlflow_tracer.record(
                ExtractionTrace(
                    file_name=file_name,
                    file_type=input_type,
                    model_used=model_used,
                    latency_ms=(time.perf_counter() - started_at) * 1000,
                    status="timeout" if getattr(exc, "error_code", "") == "model_timeout" else "failed",
                    trace_id=resolved_trace_id,
                    input_tokens=error_details.get("input_tokens") if model_result is None else model_result.input_tokens,
                    output_tokens=error_details.get("output_tokens") if model_result is None else model_result.output_tokens,
                    retry_count=retry_count,
                    job_id=job_id,
                    validation_failure_raw_output=raw_output,
                )
            )
            raise

        await self.mlflow_tracer.record(
            ExtractionTrace(
                file_name=file_name,
                file_type=input_type,
                model_used=model_used,
                latency_ms=(time.perf_counter() - started_at) * 1000,
                status="success",
                trace_id=resolved_trace_id,
                confidence_score=derived["confidence_score"],
                requires_review=derived["requires_review"],
                input_tokens=model_result.input_tokens,
                output_tokens=model_result.output_tokens,
                retry_count=retry_count,
                job_id=job_id,
            )
        )
        return ExtractResponse(
            document_id=document.id,
            confidence_score=derived["confidence_score"],
            requires_review=derived["requires_review"],
            review_status=document.review_status,
            business_duplicate_suspected=document.business_duplicate_suspected,
            missing_fields=derived["missing_fields"],
            **payload.model_dump(),
        )

    async def correct_document(
        self,
        session: AsyncSession,
        document_id: int,
        correction: CorrectionRequest,
        *,
        trace_id: str | None = None,
    ) -> CorrectionResponse:
        started_at = time.perf_counter()
        resolved_trace_id = trace_id or str(uuid.uuid4())
        repo = DocumentRepository(session)
        current = await repo.get_by_id(document_id)
        merged = ExtractResultPayload(
            document_type=self._prefer(correction.document_type, current.document_type),
            issue_date=self._prefer(correction.issue_date, current.issue_date),
            supplier_name=self._prefer(correction.supplier_name, current.supplier_name),
            supplier_address=self._prefer(correction.supplier_address, current.supplier_address),
            recipient_name=self._prefer(correction.recipient_name, current.recipient_name),
            items=correction.items if correction.items is not None else [
                {"name": item.name, "quantity": item.quantity, "unit_price": item.unit_price, "amount": item.amount}
                for item in current.items
            ],
            subtotal=self._prefer(correction.subtotal, current.subtotal),
            tax_8=self._prefer(correction.tax_8, current.tax_8),
            tax_10=self._prefer(correction.tax_10, current.tax_10),
            total=self._prefer(correction.total, current.total),
            payment_due=self._prefer(correction.payment_due, current.payment_due),
            bank_info=self._prefer(correction.bank_info, current.bank_info),
            invoice_number=self._prefer(correction.invoice_number, current.invoice_number),
        )
        derived = self._calculate_derived_values(merged)
        updated = await repo.correct_document(
            document_id,
            correction,
            derived["confidence_score"],
            derived["requires_review"],
            derived["missing_fields"],
        )
        await LogRepository(session).insert(
            current.file_name,
            "corrected",
            f"corrected_fields: {','.join(correction.corrected_fields)}",
        )
        await session.commit()
        await self.mlflow_tracer.record(
            ExtractionTrace(
                file_name=current.file_name,
                file_type="correction",
                model_used="none",
                latency_ms=(time.perf_counter() - started_at) * 1000,
                status="success",
                trace_id=resolved_trace_id,
                confidence_score=derived["confidence_score"],
                requires_review=derived["requires_review"],
            )
        )
        return CorrectionResponse(
            document_id=updated.id,
            updated_fields=correction.corrected_fields,
            confidence_score=derived["confidence_score"],
            missing_fields=derived["missing_fields"],
            requires_review=derived["requires_review"],
            review_status=updated.review_status,
            updated_at=updated.updated_at,
        )

    async def list_documents(self, session: AsyncSession, **filters) -> DocumentListResponse:
        repo = DocumentRepository(session)
        total, items = await repo.list_documents(**filters)
        page = filters.get("page", 1)
        per_page = filters.get("per_page", 20)
        return DocumentListResponse(
            total=total,
            page=page,
            per_page=per_page,
            items=[
                DocumentListItemResponse(
                    document_id=item.id,
                    file_name=item.file_name,
                    document_type=item.document_type,
                    issue_date=item.issue_date,
                    supplier_name=item.supplier_name,
                    tax_8=item.tax_8,
                    tax_10=item.tax_10,
                    total=item.total,
                    payment_due=item.payment_due,
                    invoice_number=item.invoice_number,
                    confidence_score=item.confidence_score,
                    requires_review=item.requires_review,
                    review_status=item.review_status,
                    missing_fields=item.missing_fields,
                    created_at=item.created_at,
                )
                for item in items
            ],
        )

    async def _run_model(
        self,
        input_type: str,
        file_name: str,
        text_content: str | None,
        file_bytes: bytes,
    ) -> JSONExtractionResult:
        system_prompt, user_prompt = build_extract_prompts(input_type)
        if input_type == "pdf_text":
            return await self.llm_client.extract_json_with_metadata(
                system_prompt,
                f"{user_prompt}\n{text_content or ''}",
            )
        images = self.file_processor.prepare_vlm_images(file_name, file_bytes)
        return await self.vlm_client.extract_json_with_metadata(
            system_prompt,
            user_prompt,
            images,
        )

    def _calculate_derived_values(self, payload: ExtractResultPayload) -> dict:
        payload_dict = payload.model_dump()
        required_ok = sum(1 for field in self.REQUIRED_FIELDS if payload_dict.get(field) is not None)
        optional_ok = sum(1 for field in self.OPTIONAL_FIELDS if payload_dict.get(field) not in (None, [], {}))
        confidence = (
            Decimal(required_ok / len(self.REQUIRED_FIELDS)) * Decimal("0.7")
            + Decimal(optional_ok / len(self.OPTIONAL_FIELDS)) * Decimal("0.3")
        ).quantize(Decimal("0.01"))
        missing_fields = [field for field in self.REQUIRED_FIELDS if payload_dict.get(field) is None]
        missing_fields += [field for field in self.OPTIONAL_FIELDS if payload_dict.get(field) in (None, [], {})]
        return {
            "confidence_score": confidence,
            "requires_review": confidence < Decimal("0.70"),
            "missing_fields": missing_fields,
        }

    @staticmethod
    def _prefer(candidate, fallback):
        return fallback if candidate is None else candidate
