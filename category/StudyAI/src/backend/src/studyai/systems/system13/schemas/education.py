from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    session_id: str
    project_id: str
    user_id: str
    role: str | None = None
    question: str = Field(min_length=1)


class AskSource(BaseModel):
    title: str
    category: str
    excerpt: str
    importance: str


class AskEscalation(BaseModel):
    target: str
    reason: str


class AskResponse(BaseModel):
    answer_id: int
    session_id: str
    question: str
    answer: str
    confidence: str
    sources: list[AskSource]
    warning: str | None = None
    related_info: list[str]
    escalation: AskEscalation | None = None


class CatchupReportKeyPerson(BaseModel):
    name: str
    role: str
    contact: str | None = None


class CatchupReportDocument(BaseModel):
    title: str
    category: str


class CatchupReportResponse(BaseModel):
    project_id: str
    generated_at: datetime
    overview: str
    critical_issues: list[str]
    landmines: list[str]
    key_persons: list[CatchupReportKeyPerson]
    important_docs: list[CatchupReportDocument]
    first_week_tasks: list[str]


class KnowledgeCreateRequest(BaseModel):
    project_id: str
    category: str = "general"
    title: str
    content: str = Field(min_length=1)
    importance: str = "medium"
    is_landmine: bool = False
    registered_by: str | None = None
    source_type: str = "official"


class KnowledgeCreateResponse(BaseModel):
    knowledge_id: int
    project_id: str
    title: str
    category: str
    importance: str
    is_landmine: bool
    registered_by: str | None = None


class KnowledgeListItemResponse(BaseModel):
    knowledge_id: int
    project_id: str
    category: str
    title: str
    importance: str
    is_landmine: bool
    registered_by: str | None = None
    source_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class KnowledgeListResponse(BaseModel):
    total: int
    items: list[KnowledgeListItemResponse]


class ChecklistItemResponse(BaseModel):
    item_id: int
    title: str
    category: str
    status: str
    due_days: int | None = None


class ChecklistResponse(BaseModel):
    project_id: str
    user_id: str
    role: str
    total_count: int
    completed_count: int
    items: list[ChecklistItemResponse]


class ChecklistUpdateRequest(BaseModel):
    status: str


class ChecklistUpdateResponse(BaseModel):
    project_id: str
    user_id: str
    item_id: int
    status: str


class DashboardUnansweredQuestion(BaseModel):
    question: str
    count: int


class DashboardLowProgressMember(BaseModel):
    user_id: str
    role: str
    progress_rate: float


class DashboardCategoryStat(BaseModel):
    category: str
    count: int


class DashboardResponse(BaseModel):
    project_id: str
    unanswered_questions: list[DashboardUnansweredQuestion]
    low_progress_members: list[DashboardLowProgressMember]
    category_stats: list[DashboardCategoryStat]
