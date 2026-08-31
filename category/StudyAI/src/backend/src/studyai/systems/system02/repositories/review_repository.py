from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system02.models.review import System02ContractIssue, System02ContractReview


class ReviewRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_review(
        self,
        *,
        review_type: str,
        file_name: str | None,
        file_hash: str | None,
        file_hash_b: str | None,
        document_type: str | None,
        perspective: str,
        overall_risk: str,
        recommendation: str,
        summary: dict,
        total_issues: int,
        compare_payload: dict | None = None,
    ) -> System02ContractReview:
        review = System02ContractReview(
            review_type=review_type,
            file_name=file_name,
            file_hash=file_hash,
            file_hash_b=file_hash_b,
            document_type=document_type,
            perspective=perspective,
            overall_risk=overall_risk,
            recommendation=recommendation,
            summary=summary,
            total_issues=total_issues,
            compare_payload=compare_payload or {},
        )
        self.session.add(review)
        await self.session.flush()
        await self.session.refresh(review)
        return review

    async def create_issues(self, review_id: int, issues: list[dict]) -> list[System02ContractIssue]:
        created = []
        for issue in issues:
            row = System02ContractIssue(
                review_id=review_id,
                issue_type=issue["type"],
                severity=issue["severity"],
                article=issue.get("article"),
                description=issue["description"],
                risk_explanation=issue.get("risk_explanation"),
                suggested_text=issue.get("suggested_text"),
                # 原文・原文抜粋はAPIの即時応答だけに使い、DBへ保存しない。
                original_text=None,
                position_start=issue.get("position_start"),
                position_end=issue.get("position_end"),
            )
            self.session.add(row)
            created.append(row)
        await self.session.flush()
        return created

    async def list_reviews(
        self,
        *,
        document_type: str | None = None,
        overall_risk: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[System02ContractReview]:
        stmt = select(System02ContractReview).order_by(
            System02ContractReview.created_at.desc(),
            System02ContractReview.id.desc(),
        )
        if document_type:
            stmt = stmt.where(System02ContractReview.document_type == document_type)
        if overall_risk:
            stmt = stmt.where(System02ContractReview.overall_risk == overall_risk)
        if from_date:
            stmt = stmt.where(System02ContractReview.created_at >= datetime.combine(from_date, time.min))
        if to_date:
            stmt = stmt.where(System02ContractReview.created_at < datetime.combine(to_date + timedelta(days=1), time.min))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_review(self, review_id: int) -> System02ContractReview:
        result = await self.session.execute(
            select(System02ContractReview).where(System02ContractReview.id == review_id)
        )
        review = result.scalar_one_or_none()
        if review is None:
            raise NotFoundAppError("review_not_found", "The review was not found.")
        return review
