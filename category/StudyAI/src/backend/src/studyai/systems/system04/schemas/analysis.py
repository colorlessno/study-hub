from __future__ import annotations

from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewInput(BaseModel):
    text: str = Field(min_length=1)
    score: float | None = Field(default=None, ge=0, le=5)
    date: dt_date | None = None
    product_name: str | None = None
    source_id: str | None = None


class AnalyzeRequest(BaseModel):
    product_name: str = Field(min_length=1)
    reviews: list[ReviewInput] = Field(default_factory=list, min_length=1)


class CompareProductRequest(BaseModel):
    product_name: str = Field(min_length=1)
    reviews: list[ReviewInput] = Field(default_factory=list, min_length=1)


class CompareRequest(BaseModel):
    products: list[CompareProductRequest] = Field(default_factory=list, min_length=2)


class SentimentSummaryResponse(BaseModel):
    positive: int
    negative: int
    neutral: int
    average_score: float


class TopicSummaryResponse(BaseModel):
    topic: str
    positive_count: int
    negative_count: int
    representative_text: str | None = None


class ImprovementItemResponse(BaseModel):
    priority: str
    issue: str
    suggestion: str


class RepresentativeReviewsResponse(BaseModel):
    positive: list[str] = Field(default_factory=list)
    negative: list[str] = Field(default_factory=list)


class InsightsResponse(BaseModel):
    positive_summary: str
    negative_summary: str
    keywords: dict = Field(default_factory=dict)
    improvements: list[ImprovementItemResponse] = Field(default_factory=list)
    representative_reviews: RepresentativeReviewsResponse
    trend_analysis: str | None = None


class IndividualResultResponse(BaseModel):
    source_id: str | None = None
    text: str
    sentiment: str
    sentiment_score: float
    intensity: str
    topics: list[str] = Field(default_factory=list)
    review_score: float | None = None
    review_date: dt_date | None = None


class AnalyzeResponse(BaseModel):
    analysis_id: int
    product_name: str
    total_reviews: int
    sentiment_summary: SentimentSummaryResponse
    topics: list[TopicSummaryResponse] = Field(default_factory=list)
    insights: InsightsResponse
    individual_results: list[IndividualResultResponse] = Field(default_factory=list)
    created_at: datetime


class CompareProductSummaryResponse(BaseModel):
    product_name: str
    total_reviews: int
    sentiment_summary: SentimentSummaryResponse
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)


class CompareDiffPointResponse(BaseModel):
    topic: str
    summary: str
    better_product: str | None = None


class CompareResponse(BaseModel):
    comparison_id: int
    products: list[CompareProductSummaryResponse] = Field(default_factory=list)
    diff_points: list[CompareDiffPointResponse] = Field(default_factory=list)
    recommendations: list[ImprovementItemResponse] = Field(default_factory=list)
    created_at: datetime


class AnalysisListItem(BaseModel):
    analysis_id: int
    product_name: str
    total_reviews: int
    compare_flag: bool
    created_at: datetime


class AnalysisListResponse(BaseModel):
    total: int
    items: list[AnalysisListItem] = Field(default_factory=list)


class AnalysisDetailResponse(AnalyzeResponse):
    compare_flag: bool = False
    comparison_payload: dict = Field(default_factory=dict)
