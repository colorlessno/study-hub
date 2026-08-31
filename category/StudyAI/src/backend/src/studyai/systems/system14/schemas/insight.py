from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

DataType = Literal["audio", "video", "chat", "email", "call_log"]
Sentiment = Literal["positive", "negative", "neutral"]
JobStatus = Literal["queued", "running", "completed", "failed"]
DeliveryMethod = Literal["webhook", "email", "crm", "dashboard"]


class UploadAcceptedResponse(BaseModel):
    job_id: str
    status: JobStatus
    estimated_minutes: int
    data_type: DataType
    file_count: int


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int
    data_type: str
    source: str
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class VoiceRankingItem(BaseModel):
    rank: int
    group_label: str
    count: int
    sentiment: str | None = None
    type: str | None = None
    products: list[str] = Field(default_factory=list)
    representative_text: str | None = None
    source_ids: list[str] = Field(default_factory=list)


class VoiceRankingResponse(BaseModel):
    period: str
    total_data_count: int
    ranking: list[VoiceRankingItem] = Field(default_factory=list)


class SalesScoreBreakdown(BaseModel):
    issue_exploration: int
    proposal_quality: int
    next_step_clarity: int
    listening_ratio: float


class TopQuestionItem(BaseModel):
    question_type: str
    count: int
    example: str | None = None


class SalesScoreItem(BaseModel):
    staff_id: str | None = None
    staff_name: str | None = None
    overall_score: int
    breakdown: SalesScoreBreakdown
    top_questions: list[TopQuestionItem] = Field(default_factory=list)


class SalesScoreResponse(BaseModel):
    period: str
    scores: list[SalesScoreItem] = Field(default_factory=list)


class WinLossItem(BaseModel):
    rank: int
    reason: str
    result_type: str
    category: str
    count: int
    representative_text: str | None = None


class WinLossResponse(BaseModel):
    period: str
    win_loss: list[WinLossItem] = Field(default_factory=list)


class DashboardCard(BaseModel):
    key: str
    label: str
    value: int | float | str
    unit: str | None = None


class DashboardResponse(BaseModel):
    cards: list[DashboardCard] = Field(default_factory=list)
    sentiment_summary: dict[str, int] = Field(default_factory=dict)
    top_topics: list[VoiceRankingItem] = Field(default_factory=list)
    recent_jobs: list[JobStatusResponse] = Field(default_factory=list)


class WorkflowDelivery(BaseModel):
    method: DeliveryMethod
    endpoint: str | None = None
    recipients: list[str] = Field(default_factory=list)


class WorkflowCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    trigger: Literal["realtime", "daily", "weekly", "manual"] = "manual"
    data_sources: list[str] = Field(default_factory=list)
    analysis_steps: list[str] = Field(default_factory=list)
    output_type: str = Field(min_length=1)
    filters: dict[str, Any] = Field(default_factory=dict)
    delivery: WorkflowDelivery

    @model_validator(mode="after")
    def validate_delivery_target(self) -> "WorkflowCreateRequest":
        if self.delivery.method in {"webhook", "crm"} and not self.delivery.endpoint:
            raise ValueError("webhook/crm delivery requires endpoint")
        if self.delivery.method == "email" and not self.delivery.recipients:
            raise ValueError("email delivery requires recipients")
        return self


class WorkflowDeliveryResult(BaseModel):
    log_id: int | None = None
    method: str
    destination: str | None = None
    status: Literal["success", "failed", "skipped"]
    payload: dict[str, Any] = Field(default_factory=dict)
    response: dict[str, Any] = Field(default_factory=dict)
    error_message: str | None = None
    delivered_at: datetime | None = None


class WorkflowCreateResponse(BaseModel):
    workflow_id: int
    name: str
    trigger: str
    output_type: str | None = None
    delivery: dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    created_at: datetime
    delivery_result: WorkflowDeliveryResult | None = None


class AgentChatRequest(BaseModel):
    session_id: str | None = None
    question: str = Field(min_length=1)
    filters: dict[str, Any] = Field(default_factory=dict)


class RelatedLink(BaseModel):
    label: str
    endpoint: str


class AgentChatResponse(BaseModel):
    answer_id: int
    question: str
    answer: str
    recommended_actions: list[str] = Field(default_factory=list)
    evidence: dict[str, Any] = Field(default_factory=dict)
    related_links: list[RelatedLink] = Field(default_factory=list)


class ActionProposalItem(BaseModel):
    priority: str
    issue: str
    evidence_count: int
    recommended_action: str
    target_department: str


class ActionProposalResponse(BaseModel):
    product: str | None = None
    proposals: list[ActionProposalItem] = Field(default_factory=list)


class SuggestedFAQ(BaseModel):
    question: str
    answer: str


class FAQGapItem(BaseModel):
    rank: int
    call_reason: str
    inquiry_count: int
    existing_faq: str | None = None
    suggested_faq: SuggestedFAQ


class FAQGapResponse(BaseModel):
    product: str | None = None
    faq_gaps: list[FAQGapItem] = Field(default_factory=list)


class InsightFilter(BaseModel):
    from_date: date | None = None
    to_date: date | None = None
    product: str | None = None
    call_reason: str | None = None
    sentiment: Sentiment | None = None
    utterance_type: str | None = None
    limit: int = Field(default=20, ge=1, le=100)

    @model_validator(mode="after")
    def validate_date_range(self) -> "InsightFilter":
        if self.from_date and self.to_date and self.from_date > self.to_date:
            raise ValueError("from_date must be less than or equal to to_date")
        return self
