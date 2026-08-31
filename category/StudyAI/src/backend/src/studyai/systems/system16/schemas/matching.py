from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    requirement_text: str = Field(min_length=1)
    candidate_text: str = Field(min_length=1)


class ScoreBreakdown(BaseModel):
    technical_skills: float
    process_experience: float
    domain_experience: float
    role_experience: float


class MatchReport(BaseModel):
    match_reasons: str
    strengths: list[str]
    concerns: list[str]
    check_points: list[str]
    overall_comment: str


class SimilarCaseResponse(BaseModel):
    summary: str
    similarity_score: float
    result: str | None = None
    notes: str | None = None


class MatchResponse(BaseModel):
    match_id: int
    score: float
    level: str
    parse_confidence: float
    review_required: bool
    review_reasons: list[str]
    score_breakdown: ScoreBreakdown
    report: MatchReport
    similar_cases: list[SimilarCaseResponse]
    bulk_id: int | None = None
    candidate_id: str | None = None
    created_at: datetime


class BulkMatchItemResponse(MatchResponse):
    pass


class BulkMatchResponse(BaseModel):
    bulk_id: int
    total_candidates: int
    results: list[BulkMatchItemResponse]


class SkillsheetParseResponse(BaseModel):
    layout_type: str
    parse_confidence: float
    review_required: bool
    review_reasons: list[str]
    unresolved_skills: list[str]
    parsed_result: dict[str, Any]


class PastCaseCreateRequest(BaseModel):
    requirement_summary: str = Field(min_length=1)
    candidate_profile: str | None = None
    result: str | None = None
    notes: str | None = None


class PastCaseCreateResponse(BaseModel):
    knowledge_id: int
    created_at: datetime


class MatchListItem(BaseModel):
    match_id: int
    score: float
    level: str
    review_required: bool
    bulk_id: int | None = None
    candidate_id: str | None = None
    created_at: datetime


class MatchListResponse(BaseModel):
    total: int
    items: list[MatchListItem]
