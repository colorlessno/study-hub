from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system06.models.support import System06Faq


class FAQRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_faq(
        self,
        *,
        faq_no: str | None,
        title: str,
        question: str,
        answer: str,
        category: str | None,
        embedding: list[float] | None,
    ) -> System06Faq:
        faq = System06Faq(
            faq_no=faq_no,
            title=title,
            question=question,
            answer=answer,
            category=category,
            embedding=embedding,
            is_active=True,
            use_count=0,
        )
        self.session.add(faq)
        await self.session.flush()
        await self.session.refresh(faq)
        return faq

    async def list_active_faqs(self) -> list[System06Faq]:
        result = await self.session.execute(
            select(System06Faq)
            .where(System06Faq.is_active.is_(True))
            .order_by(System06Faq.use_count.desc(), System06Faq.id.asc())
        )
        return list(result.scalars().all())

    async def increment_use_counts(self, faq_ids: list[int]) -> None:
        if not faq_ids:
            return
        result = await self.session.execute(select(System06Faq).where(System06Faq.id.in_(faq_ids)))
        for faq in result.scalars():
            faq.use_count += 1
        await self.session.flush()

    async def list_top_faqs(self, limit: int = 5) -> list[System06Faq]:
        result = await self.session.execute(
            select(System06Faq)
            .where(System06Faq.is_active.is_(True))
            .order_by(System06Faq.use_count.desc(), System06Faq.id.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_id(self, faq_id: int) -> System06Faq:
        result = await self.session.execute(select(System06Faq).where(System06Faq.id == faq_id))
        faq = result.scalar_one_or_none()
        if faq is None:
            raise NotFoundAppError("faq_not_found", "The faq could not be found.")
        return faq

    async def count_all(self) -> int:
        return (await self.session.execute(select(func.count()).select_from(System06Faq))).scalar_one()
