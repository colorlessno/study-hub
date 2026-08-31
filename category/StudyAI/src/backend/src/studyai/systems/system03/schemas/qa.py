from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    session_id: str
    project_id: str
    user_id: str
    question: str
    category_filter: list[str] = Field(default_factory=list)


class AskSource(BaseModel):
    document_name: str
    section: str | None = None
    excerpt: str


class AskResponse(BaseModel):
    answer_id: int
    session_id: str
    question: str
    answer: str
    confidence: str
    sources: list[AskSource]
    related_questions: list[str]


class FeedbackRequest(BaseModel):
    answer_id: int
    is_helpful: bool
    comment: str | None = None


class FeedbackResponse(BaseModel):
    answer_id: int
    rating: int
    comment: str | None = None


class DocumentRegisterResponse(BaseModel):
    document_id: int
    file_name: str
    chunk_count: int
    category: str
    version: str | None = None


class DocumentListItemResponse(BaseModel):
    document_id: int
    project_id: str
    file_name: str
    category: str
    version: str | None = None
    chunk_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    total: int
    items: list[DocumentListItemResponse]


class DocumentDeleteResponse(BaseModel):
    document_id: int
    status: str


class PopularQuestionItem(BaseModel):
    question: str
    count: int
    avg_rating: float | None = None


class PopularQuestionsResponse(BaseModel):
    items: list[PopularQuestionItem]


class UnansweredQuestionItem(BaseModel):
    question: str
    count: int


class UnansweredQuestionsResponse(BaseModel):
    items: list[UnansweredQuestionItem]
