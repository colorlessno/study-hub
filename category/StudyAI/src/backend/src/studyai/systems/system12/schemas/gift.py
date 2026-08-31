from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1)
    message: str = Field(min_length=1)


class ChatRecommendationItem(BaseModel):
    rank: int
    product_id: int
    product_name: str
    price: float
    image_url: str | None = None
    reason: str
    suitable_for: str | None = None
    cautions: str | None = None
    wrapping: str | None = None
    score: float


class ChatResponse(BaseModel):
    session_id: str
    response_type: str
    message: str
    collected_conditions: dict = Field(default_factory=dict)
    missing_conditions: list[str] = Field(default_factory=list)
    recommendations: list[ChatRecommendationItem] = Field(default_factory=list)


class ChatFeedbackRequest(BaseModel):
    session_id: str = Field(min_length=1)
    liked: bool
    disliked_reasons: list[str] = Field(default_factory=list)
    selected_product_id: int | None = None


class ChatFeedbackResponse(BaseModel):
    session_id: str
    stored: bool
    message: str


class ProductCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    category: str | None = None
    price: float = Field(ge=0)
    tags: list[str] = Field(default_factory=list)
    attributes: dict = Field(default_factory=dict)
    suitable_scenes: list[str] = Field(default_factory=list)
    suitable_recipients: list[str] = Field(default_factory=list)
    formality: int | None = Field(default=None, ge=1, le=5)
    description: str | None = None
    image_url: str | None = None
    is_active: bool = True


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    price: float | None = Field(default=None, ge=0)
    tags: list[str] | None = None
    attributes: dict | None = None
    suitable_scenes: list[str] | None = None
    suitable_recipients: list[str] | None = None
    formality: int | None = Field(default=None, ge=1, le=5)
    description: str | None = None
    image_url: str | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    product_id: int
    name: str
    category: str | None = None
    price: float
    tags: list[str] = Field(default_factory=list)
    suitable_scenes: list[str] = Field(default_factory=list)
    suitable_recipients: list[str] = Field(default_factory=list)
    formality: int | None = None
    description: str | None = None
    image_url: str | None = None
    is_active: bool


class ProductListResponse(BaseModel):
    items: list[ProductResponse] = Field(default_factory=list)


class SceneCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    formality: int | None = Field(default=None, ge=1, le=5)
    timing: str | None = None
    description: str | None = None


class SceneResponse(BaseModel):
    scene_id: int
    name: str
    formality: int | None = None
    timing: str | None = None
    description: str | None = None


class NgRuleCreateRequest(BaseModel):
    scene_name: str | None = None
    recipient_name: str | None = None
    ng_attribute: str = Field(min_length=1)
    reason: str | None = None
    severity: str = "warn"


class NgRuleResponse(BaseModel):
    rule_id: int
    scene_name: str | None = None
    recipient_name: str | None = None
    ng_attribute: str
    reason: str | None = None
    severity: str


class RecommendationAnalyticsItem(BaseModel):
    product_id: int
    product_name: str
    recommendation_count: int
    positive_feedback_count: int
    negative_feedback_count: int


class RecommendationAnalyticsResponse(BaseModel):
    total_sessions: int
    total_recommendations: int
    items: list[RecommendationAnalyticsItem] = Field(default_factory=list)
    generated_at: datetime
