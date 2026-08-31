from __future__ import annotations

import asyncio
import hashlib
import time

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ExternalServiceError, ValidationAppError
from studyai.systems.system02.repositories.review_repository import ReviewRepository
from studyai.systems.system02.schemas.review import (
    CompareResponse,
    ReviewCompareResponse,
    ReviewDetailResponse,
    ReviewIssueResponse,
    ReviewListItem,
    ReviewListResponse,
    ReviewResponse,
    ReviewSummaryResponse,
)
from studyai.systems.system02.services.chunk_service import ChunkService
from studyai.systems.system02.services.compare_review_engine import CompareReviewEngine
from studyai.systems.system02.services.document_parser import DocumentParser
from studyai.systems.system02.services.issue_aggregator import IssueAggregator
from studyai.systems.system02.services.risk_review_engine import RiskReviewEngine
from studyai.systems.system02.utils.mlflow_tracer import MLflowTracer, ReviewTrace


class ReviewService:
    MAX_FILE_BYTES = 20 * 1024 * 1024
    MAX_DOCUMENT_PAGES = 50
    MAX_DOCUMENT_CHARACTERS = 90_000
    ALLOWED_PERSPECTIVES = {
        "委託者",
        "受託者",
        "買主",
        "売主",
        "賃借人",
        "賃貸人",
        "労働者",
        "使用者",
        "中立",
    }

    def __init__(self) -> None:
        self.document_parser = DocumentParser()
        self.chunk_service = ChunkService()
        self.risk_review_engine = RiskReviewEngine()
        self.compare_review_engine = CompareReviewEngine()
        self.issue_aggregator = IssueAggregator()
        self.audit_logger = get_audit_logger()
        self.mlflow_tracer = MLflowTracer()

    async def review_document(
        self,
        session: AsyncSession,
        *,
        file_name: str,
        file_bytes: bytes,
        perspective: str,
        trace_id: str,
        user_id: str | None,
    ) -> ReviewResponse:
        started_at = time.perf_counter()
        chunks: list[dict] = []
        generation = None
        try:
            self._validate_perspective(perspective)
            text, _ = self._prepare_document(file_name, file_bytes)
            chunks = self.chunk_service.split_by_clause(text)
            generation = await self._run_with_timeout(
                self.risk_review_engine.run_review(
                    chunks=chunks,
                    perspective=perspective,
                )
            )
            issues = self.issue_aggregator.merge_issues(generation.issues)
            summary = self.issue_aggregator.build_summary(issues)
            repository = ReviewRepository(session)
            review = await repository.create_review(
                review_type="single",
                file_name=file_name,
                file_hash=self._sha256(file_bytes),
                file_hash_b=None,
                document_type=generation.document_type,
                perspective=perspective,
                overall_risk=summary["overall_risk"],
                recommendation=summary["recommendation"],
                summary=summary,
                total_issues=summary["total_issues"],
            )
            await repository.create_issues(review.id, issues)
            await session.commit()
        except Exception as exc:
            await session.rollback()
            await self._record_trace(
                operation="single",
                started_at=started_at,
                trace_id=trace_id,
                chunk_count=len(chunks),
                issue_count=0,
                status="failed",
                error_code=getattr(exc, "error_code", type(exc).__name__),
            )
            raise
        await self._record_trace(
            operation="single",
            started_at=started_at,
            trace_id=trace_id,
            chunk_count=len(chunks),
            issue_count=len(issues),
            status="success",
            model_used=generation.model_used,
            input_tokens=generation.input_tokens,
            output_tokens=generation.output_tokens,
            retry_count=generation.retry_count,
        )
        self.audit_logger.log(
            action="system02.review.single",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system02_review",
            resource_id=review.id,
            details={"document_type": generation.document_type, "issues": len(issues)},
        )
        return ReviewResponse(
            review_id=review.id,
            document_type=generation.document_type,
            perspective=perspective,
            summary=ReviewSummaryResponse(**summary),
            issues=[ReviewIssueResponse(issue_id=index + 1, **issue) for index, issue in enumerate(issues)],
        )

    async def compare_documents(
        self,
        session: AsyncSession,
        *,
        file_name_a: str,
        file_bytes_a: bytes,
        file_name_b: str,
        file_bytes_b: bytes,
        perspective: str,
        trace_id: str,
        user_id: str | None,
    ) -> CompareResponse:
        started_at = time.perf_counter()
        chunks_a: list[dict] = []
        chunks_b: list[dict] = []
        review_a = None
        review_b = None
        comparison = None
        try:
            self._validate_perspective(perspective)
            text_a, pages_a = self._prepare_document(file_name_a, file_bytes_a)
            text_b, pages_b = self._prepare_document(file_name_b, file_bytes_b)
            if pages_a is not None and pages_b is not None and pages_a + pages_b > 100:
                raise ValidationAppError(
                    "document_page_limit_exceeded",
                    "比較審査は2文書合計100ページ以内で指定してください。",
                )
            chunks_a = self.chunk_service.split_by_clause(text_a)
            chunks_b = self.chunk_service.split_by_clause(text_b)
            review_a = await self._run_with_timeout(
                self.risk_review_engine.run_review(
                    chunks=chunks_a,
                    perspective=perspective,
                )
            )
            review_b = await self._run_with_timeout(
                self.risk_review_engine.run_review(
                    chunks=chunks_b,
                    perspective=perspective,
                )
            )
            issues_a = self.issue_aggregator.merge_issues(review_a.issues)
            issues_b = self.issue_aggregator.merge_issues(review_b.issues)
            summary_a = self.issue_aggregator.build_summary(issues_a)
            summary_b = self.issue_aggregator.build_summary(issues_b)
            comparison = await self._run_with_timeout(
                self.compare_review_engine.run_compare(
                    self.chunk_service.align_for_compare(text_a, text_b)
                )
            )
            diff_issues = self.issue_aggregator.merge_issues(comparison.issues)
            repository = ReviewRepository(session)
            compare_summary = self.issue_aggregator.build_summary(diff_issues)
            review = await repository.create_review(
                review_type="compare",
                file_name=f"{file_name_a} vs {file_name_b}",
                file_hash=self._sha256(file_bytes_a),
                file_hash_b=self._sha256(file_bytes_b),
                document_type=review_b.document_type,
                perspective=perspective,
                overall_risk=compare_summary["overall_risk"],
                recommendation=compare_summary["recommendation"],
                summary=compare_summary,
                total_issues=compare_summary["total_issues"],
                compare_payload={"review_a": summary_a, "review_b": summary_b},
            )
            await repository.create_issues(review.id, diff_issues)
            await session.commit()
        except Exception as exc:
            await session.rollback()
            await self._record_trace(
                operation="compare",
                started_at=started_at,
                trace_id=trace_id,
                chunk_count=len(chunks_a) + len(chunks_b),
                issue_count=0,
                status="failed",
                error_code=getattr(exc, "error_code", type(exc).__name__),
            )
            raise
        await self._record_trace(
            operation="compare",
            started_at=started_at,
            trace_id=trace_id,
            chunk_count=len(chunks_a) + len(chunks_b),
            issue_count=len(diff_issues),
            status="success",
            model_used=comparison.model_used,
            input_tokens=self._sum_optional(
                review_a.input_tokens,
                review_b.input_tokens,
                comparison.input_tokens,
            ),
            output_tokens=self._sum_optional(
                review_a.output_tokens,
                review_b.output_tokens,
                comparison.output_tokens,
            ),
            retry_count=review_a.retry_count + review_b.retry_count + comparison.retry_count,
        )
        self.audit_logger.log(
            action="system02.review.compare",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system02_review",
            resource_id=review.id,
            details={"diff_issues": len(diff_issues)},
        )
        return CompareResponse(
            comparison_id=review.id,
            review_a=ReviewSummaryResponse(**summary_a),
            review_b=ReviewSummaryResponse(**summary_b),
            diff_issues=[ReviewIssueResponse(issue_id=index + 1, **issue) for index, issue in enumerate(diff_issues)],
            recommendation_diff={
                "from": summary_a["recommendation"],
                "to": summary_b["recommendation"],
            },
        )

    async def list_reviews(
        self,
        session: AsyncSession,
        *,
        document_type: str | None,
        overall_risk: str | None,
        from_date,
        to_date,
    ) -> ReviewListResponse:
        reviews = await ReviewRepository(session).list_reviews(
            document_type=document_type,
            overall_risk=overall_risk,
            from_date=from_date,
            to_date=to_date,
        )
        return ReviewListResponse(
            total=len(reviews),
            items=[
                ReviewListItem(
                    review_id=review.id,
                    review_type=review.review_type,
                    document_type=review.document_type,
                    overall_risk=review.overall_risk,
                    recommendation=review.recommendation,
                    created_at=review.created_at,
                )
                for review in reviews
            ],
        )

    async def get_review(self, session: AsyncSession, *, review_id: int) -> ReviewDetailResponse:
        review = await ReviewRepository(session).get_review(review_id)
        return ReviewDetailResponse(
            review_id=review.id,
            review_type=review.review_type,
            document_type=review.document_type,
            perspective=review.perspective,
            summary=ReviewSummaryResponse(**review.summary),
            issues=[
                ReviewIssueResponse(
                    issue_id=issue.id,
                    type=issue.issue_type,
                    severity=issue.severity,
                    article=issue.article,
                    original_text=None,
                    description=issue.description,
                    risk_explanation=issue.risk_explanation,
                    suggested_text=issue.suggested_text,
                )
                for issue in review.issues
            ],
            created_at=review.created_at,
        )

    async def compare_saved_reviews(self, session: AsyncSession, *, review_id_a: int, review_id_b: int) -> ReviewCompareResponse:
        if review_id_a == review_id_b:
            raise ValidationAppError(
                "same_review_ids",
                "異なる2件の審査結果を指定してください。",
            )
        repository = ReviewRepository(session)
        review_a = await repository.get_review(review_id_a)
        review_b = await repository.get_review(review_id_b)
        issues_a = {self._issue_key(issue): issue for issue in review_a.issues}
        issues_b = {self._issue_key(issue): issue for issue in review_b.issues}
        added = [issues_b[key] for key in issues_b.keys() - issues_a.keys()]
        removed = [issues_a[key] for key in issues_a.keys() - issues_b.keys()]
        return ReviewCompareResponse(
            review_id_a=review_a.id,
            review_id_b=review_b.id,
            overall_risk_diff={"from": review_a.overall_risk, "to": review_b.overall_risk},
            recommendation_diff={"from": review_a.recommendation, "to": review_b.recommendation},
            issue_count_diff=review_b.total_issues - review_a.total_issues,
            added_issues=[self._issue_model_to_schema(issue) for issue in added],
            removed_issues=[self._issue_model_to_schema(issue) for issue in removed],
        )

    def _prepare_document(self, file_name: str, file_bytes: bytes) -> tuple[str, int | None]:
        if not file_bytes:
            raise ValidationAppError("empty_document", "文書が空です。")
        if len(file_bytes) > self.MAX_FILE_BYTES:
            raise ValidationAppError(
                "file_too_large",
                "1ファイルは20MB以内で指定してください。",
            )
        page_count = self.document_parser.count_pages(file_name, file_bytes)
        if page_count is not None and page_count > self.MAX_DOCUMENT_PAGES:
            raise ValidationAppError(
                "document_page_limit_exceeded",
                "1文書は50ページ以内で指定してください。",
            )
        text = self.document_parser.extract_text(file_name, file_bytes)
        if not text.strip():
            raise ValidationAppError("empty_document", "文書から文字列を取得できませんでした。")
        if len(text) > self.MAX_DOCUMENT_CHARACTERS:
            raise ValidationAppError(
                "document_text_limit_exceeded",
                "抽出した本文が審査可能な長さを超えています。",
            )
        return text, page_count

    def _validate_perspective(self, perspective: str) -> None:
        if perspective not in self.ALLOWED_PERSPECTIVES:
            raise ValidationAppError(
                "invalid_perspective",
                "審査視点は定義済みの当事者ロールまたは中立を指定してください。",
            )

    async def _record_trace(
        self,
        *,
        operation: str,
        started_at: float,
        trace_id: str,
        chunk_count: int,
        issue_count: int,
        status: str,
        model_used: str | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        retry_count: int = 0,
        error_code: str | None = None,
    ) -> None:
        await self.mlflow_tracer.record(
            ReviewTrace(
                operation=operation,
                model_used=model_used or self.risk_review_engine.llm_client.settings.get_llm_model(),
                latency_ms=(time.perf_counter() - started_at) * 1000,
                status=status,
                trace_id=trace_id,
                chunk_count=chunk_count,
                issue_count=issue_count,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                retry_count=retry_count,
                error_code=error_code,
            )
        )

    @staticmethod
    async def _run_with_timeout(operation):
        try:
            # 1回のLLM処理だけを待ち、別処理は同時に開始しない。
            return await asyncio.wait_for(operation, timeout=90)
        except asyncio.TimeoutError as exc:
            raise ExternalServiceError(
                "review_timeout",
                "契約審査が90秒以内に完了しませんでした。",
            ) from exc

    @staticmethod
    def _sum_optional(*values: int | None) -> int | None:
        present = [value for value in values if value is not None]
        return sum(present) if present else None

    @staticmethod
    def _sha256(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    def _issue_key(issue) -> tuple:
        return issue.issue_type, issue.severity, issue.article, issue.description

    @staticmethod
    def _issue_model_to_schema(issue) -> ReviewIssueResponse:
        return ReviewIssueResponse(
            issue_id=issue.id,
            type=issue.issue_type,
            severity=issue.severity,
            article=issue.article,
            original_text=None,
            description=issue.description,
            risk_explanation=issue.risk_explanation,
            suggested_text=issue.suggested_text,
        )
