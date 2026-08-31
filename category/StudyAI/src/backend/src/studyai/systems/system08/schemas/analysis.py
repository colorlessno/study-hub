from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AnalysisCreateRequest(BaseModel):
    theme: str = Field(min_length=1)
    background: str | None = None
    current_status: str | None = None
    constraints: str | None = None
    role: str | None = None
    depth: str = "詳細レベル"
    output_format: str = "json"


class TaskReference(BaseModel):
    title: str
    url: str


class TaskResponse(BaseModel):
    task_id: int
    task_no: int
    name: str
    description: str
    category: str | None = None
    priority: str
    urgency: str | None = None
    importance: str | None = None
    quadrant: str | None = None
    dependencies: list[int] = Field(default_factory=list)
    estimated_hours: float | None = None
    assignee_skill: str | None = None
    cautions: str | None = None
    references: list[TaskReference] = Field(default_factory=list)
    confidence: str | None = None
    status: str
    note: str | None = None


class PrioritySummaryResponse(BaseModel):
    quadrant_1: list[int] = Field(default_factory=list)
    quadrant_2: list[int] = Field(default_factory=list)
    quadrant_3: list[int] = Field(default_factory=list)
    quadrant_4: list[int] = Field(default_factory=list)
    recommended_order: list[int] = Field(default_factory=list)
    first_week_tasks: list[int] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    analysis_id: int
    theme: str
    search_count: int
    search_queries: list[str] = Field(default_factory=list)
    tasks: list[TaskResponse] = Field(default_factory=list)
    priority_summary: PrioritySummaryResponse
    markdown: str
    total_tasks: int
    total_estimated_hours: float
    status: str
    created_at: datetime


class AnalysisListItem(BaseModel):
    analysis_id: int
    theme: str
    status: str
    search_count: int
    total_tasks: int
    created_at: datetime


class AnalysisListResponse(BaseModel):
    total: int
    items: list[AnalysisListItem] = Field(default_factory=list)


class TaskStatusUpdateRequest(BaseModel):
    status: str = Field(min_length=1)
    note: str | None = None


class TaskStatusUpdateResponse(BaseModel):
    analysis_id: int
    task_id: int
    status: str
    note: str | None = None


class AnalysisExportResponse(BaseModel):
    analysis_id: int
    format: str
    content: str
