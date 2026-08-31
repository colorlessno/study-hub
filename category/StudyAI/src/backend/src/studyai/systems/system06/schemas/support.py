from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class InquiryCreateRequest(BaseModel):
    session_id: str
    user_id: str
    message: str = Field(min_length=1, max_length=5000)
    order_id: str | None = None
    member_id: str | None = None
    channel: str = "form"
    context_note: str | None = None


class SupportClassification(BaseModel):
    category: str
    priority: str
    confidence: str


class InquiryResponseBody(BaseModel):
    type: str
    message: str
    sources: list[str]
    next_actions: list[str]
    is_resolved_question: str | None = None
    escalation_reason: str | None = None


class InquiryCreateResponse(BaseModel):
    inquiry_id: int
    session_id: str
    classification: SupportClassification
    response: InquiryResponseBody
    escalated: bool
    escalation_id: int | None = None


class InquiryFeedbackRequest(BaseModel):
    is_resolved: bool
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = None


class InquiryFeedbackResponse(BaseModel):
    inquiry_id: int
    is_resolved: bool
    rating: int | None = None
    comment: str | None = None


class InquiryStatusUpdateRequest(BaseModel):
    status: str
    assignee: str | None = None
    resolution: str | None = None


class InquiryStatusUpdateResponse(BaseModel):
    inquiry_id: int
    status: str
    assignee: str | None = None
    resolution: str | None = None


class FAQCreateRequest(BaseModel):
    faq_no: str | None = None
    title: str
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    category: str | None = None


class FAQCreateResponse(BaseModel):
    faq_id: int
    faq_no: str | None = None
    title: str
    category: str | None = None


class FAQImportResponse(BaseModel):
    imported_count: int
    failed_rows: list[dict]


class InquiryListItem(BaseModel):
    inquiry_id: int
    session_id: str | None = None
    user_id: str | None = None
    channel: str
    category: str | None = None
    priority: str | None = None
    confidence: str | None = None
    status: str
    escalated: bool
    response_type: str | None = None
    created_at: datetime


class InquiryListResponse(BaseModel):
    total: int
    items: list[InquiryListItem]


class StatsCountItem(BaseModel):
    label: str
    count: int


class TopFAQItem(BaseModel):
    faq_id: int
    faq_no: str | None = None
    title: str
    use_count: int


class UnansweredTopicItem(BaseModel):
    category: str
    count: int


class StatsSummaryResponse(BaseModel):
    total_inquiries: int
    resolved_count: int
    escalation_count: int
    resolution_rate: float
    escalation_rate: float
    category_counts: list[StatsCountItem]
    priority_counts: list[StatsCountItem]
    top_faqs: list[TopFAQItem]
    unanswered_topics: list[UnansweredTopicItem]
