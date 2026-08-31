from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system06.repositories.faq_repository import FAQRepository
from studyai.systems.system06.repositories.inquiry_repository import InquiryRepository
from studyai.systems.system06.schemas.support import (
    StatsCountItem,
    StatsSummaryResponse,
    TopFAQItem,
    UnansweredTopicItem,
)


class StatsService:
    async def get_summary(self, session: AsyncSession) -> StatsSummaryResponse:
        inquiry_summary = await InquiryRepository(session).get_summary()
        top_faqs = await FAQRepository(session).list_top_faqs(limit=5)
        total = inquiry_summary["total_inquiries"]
        resolved = inquiry_summary["resolved_count"]
        escalated = inquiry_summary["escalation_count"]
        resolution_rate = round((resolved / total), 4) if total else 0.0
        escalation_rate = round((escalated / total), 4) if total else 0.0
        return StatsSummaryResponse(
            total_inquiries=total,
            resolved_count=resolved,
            escalation_count=escalated,
            resolution_rate=resolution_rate,
            escalation_rate=escalation_rate,
            category_counts=[
                StatsCountItem(label=item["category"], count=item["count"])
                for item in inquiry_summary["category_counts"]
            ],
            priority_counts=[
                StatsCountItem(label=item["priority"], count=item["count"])
                for item in inquiry_summary["priority_counts"]
            ],
            top_faqs=[
                TopFAQItem(faq_id=faq.id, faq_no=faq.faq_no, title=faq.title, use_count=faq.use_count)
                for faq in top_faqs
            ],
            unanswered_topics=[
                UnansweredTopicItem(category=item["category"], count=item["count"])
                for item in inquiry_summary["unanswered_topics"]
            ],
        )
