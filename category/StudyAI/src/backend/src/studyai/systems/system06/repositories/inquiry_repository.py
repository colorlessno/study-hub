from __future__ import annotations

from datetime import date, datetime, time

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system06.models.support import System06Inquiry


class InquiryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_inquiry(
        self,
        *,
        session_id: str,
        user_id: str,
        channel: str,
        order_id: str | None,
        member_id: str | None,
        message_masked: str,
        category: str,
        priority: str,
        confidence: str,
        response_type: str,
        response_message: str,
        response_sources: list[str],
        next_actions: list[str],
        status: str,
        escalated: bool,
    ) -> System06Inquiry:
        inquiry = System06Inquiry(
            session_id=session_id,
            user_id=user_id,
            channel=channel,
            order_id=order_id,
            member_id=member_id,
            message_masked=message_masked,
            category=category,
            priority=priority,
            confidence=confidence,
            response_type=response_type,
            response_message=response_message,
            response_sources=response_sources,
            next_actions=next_actions,
            status=status,
            escalated=escalated,
        )
        self.session.add(inquiry)
        await self.session.flush()
        await self.session.refresh(inquiry)
        return inquiry

    async def get_by_id(self, inquiry_id: int) -> System06Inquiry:
        result = await self.session.execute(
            select(System06Inquiry).where(System06Inquiry.id == inquiry_id)
        )
        inquiry = result.scalar_one_or_none()
        if inquiry is None:
            raise NotFoundAppError("inquiry_not_found", "The inquiry could not be found.")
        return inquiry

    async def update_feedback(
        self,
        *,
        inquiry_id: int,
        is_resolved: bool,
        rating: int | None,
        comment: str | None,
    ) -> System06Inquiry:
        inquiry = await self.get_by_id(inquiry_id)
        inquiry.is_resolved = is_resolved
        inquiry.rating = rating
        inquiry.feedback_comment = comment
        await self.session.flush()
        await self.session.refresh(inquiry)
        return inquiry

    async def update_status(
        self,
        *,
        inquiry_id: int,
        status: str,
        assignee: str | None,
        resolution: str | None,
    ) -> System06Inquiry:
        inquiry = await self.get_by_id(inquiry_id)
        inquiry.status = status
        inquiry.assignee = assignee
        inquiry.resolution = resolution
        if status == "answered" and resolution:
            inquiry.is_resolved = True
        await self.session.flush()
        await self.session.refresh(inquiry)
        return inquiry

    async def list_inquiries(
        self,
        *,
        category: str | None,
        priority: str | None,
        status: str | None,
        escalated: bool | None,
        from_date: date | None,
        to_date: date | None,
    ) -> list[System06Inquiry]:
        stmt = select(System06Inquiry)
        if category:
            stmt = stmt.where(System06Inquiry.category == category)
        if priority:
            stmt = stmt.where(System06Inquiry.priority == priority)
        if status:
            stmt = stmt.where(System06Inquiry.status == status)
        if escalated is not None:
            stmt = stmt.where(System06Inquiry.escalated.is_(escalated))
        if from_date:
            stmt = stmt.where(System06Inquiry.created_at >= datetime.combine(from_date, time.min))
        if to_date:
            stmt = stmt.where(System06Inquiry.created_at <= datetime.combine(to_date, time.max))
        result = await self.session.execute(
            stmt.order_by(System06Inquiry.created_at.desc(), System06Inquiry.id.desc())
        )
        return list(result.scalars().all())

    async def count_same_user_category(self, *, user_id: str, category: str) -> int:
        stmt = select(func.count()).select_from(System06Inquiry).where(
            System06Inquiry.user_id == user_id,
            System06Inquiry.category == category,
        )
        return (await self.session.execute(stmt)).scalar_one()

    async def list_resolved_examples(self, *, category: str, limit: int = 3) -> list[System06Inquiry]:
        stmt = (
            select(System06Inquiry)
            .where(
                System06Inquiry.category == category,
                System06Inquiry.is_resolved.is_(True),
                System06Inquiry.response_message.is_not(None),
            )
            .order_by(System06Inquiry.updated_at.desc(), System06Inquiry.id.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_summary(self) -> dict:
        total = (await self.session.execute(select(func.count()).select_from(System06Inquiry))).scalar_one()
        resolved = (
            await self.session.execute(
                select(func.count()).select_from(System06Inquiry).where(System06Inquiry.is_resolved.is_(True))
            )
        ).scalar_one()
        escalated = (
            await self.session.execute(
                select(func.count()).select_from(System06Inquiry).where(System06Inquiry.escalated.is_(True))
            )
        ).scalar_one()

        category_rows = await self.session.execute(
            select(System06Inquiry.category, func.count())
            .group_by(System06Inquiry.category)
            .order_by(func.count().desc())
        )
        priority_rows = await self.session.execute(
            select(System06Inquiry.priority, func.count())
            .group_by(System06Inquiry.priority)
            .order_by(func.count().desc())
        )
        unresolved_rows = await self.session.execute(
            select(System06Inquiry.category, func.count())
            .where(
                or_(
                    System06Inquiry.is_resolved.is_(False),
                    System06Inquiry.escalated.is_(True),
                )
            )
            .group_by(System06Inquiry.category)
            .order_by(func.count().desc())
            .limit(5)
        )
        return {
            "total_inquiries": total,
            "resolved_count": resolved,
            "escalation_count": escalated,
            "category_counts": [
                {"category": category or "未分類", "count": count} for category, count in category_rows.all()
            ],
            "priority_counts": [
                {"priority": priority or "未分類", "count": count} for priority, count in priority_rows.all()
            ],
            "unanswered_topics": [
                {"category": category or "未分類", "count": count} for category, count in unresolved_rows.all()
            ],
        }
