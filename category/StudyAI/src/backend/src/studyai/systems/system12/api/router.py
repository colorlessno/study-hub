from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated, require_roles
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.systems.system12.schemas.gift import (
    ChatFeedbackRequest,
    ChatFeedbackResponse,
    ChatRequest,
    ChatResponse,
    NgRuleCreateRequest,
    NgRuleResponse,
    ProductCreateRequest,
    ProductListResponse,
    ProductResponse,
    ProductUpdateRequest,
    RecommendationAnalyticsResponse,
    SceneCreateRequest,
    SceneResponse,
)
from studyai.systems.system12.services.analytics_service import AnalyticsService
from studyai.systems.system12.services.chat_service import ChatService
from studyai.systems.system12.services.product_admin_service import ProductAdminService

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ChatResponse:
    return await ChatService().chat(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/chat/feedback", response_model=ChatFeedbackResponse)
async def submit_feedback(
    body: ChatFeedbackRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ChatFeedbackResponse:
    return await ChatService().submit_feedback(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/products", response_model=ProductResponse)
async def create_product(
    body: ProductCreateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("admin", "ec_admin", "md_admin")),
    session: AsyncSession = Depends(get_db_session),
) -> ProductResponse:
    return await ProductAdminService().create_product(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.get("/products", response_model=ProductListResponse)
async def list_products(
    _: AuthenticatedUser = Depends(require_roles("admin", "ec_admin", "md_admin")),
    session: AsyncSession = Depends(get_db_session),
) -> ProductListResponse:
    return await ProductAdminService().list_products(session)


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    body: ProductUpdateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("admin", "ec_admin", "md_admin")),
    session: AsyncSession = Depends(get_db_session),
) -> ProductResponse:
    return await ProductAdminService().update_product(
        session,
        product_id=product_id,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/ontology/scenes", response_model=SceneResponse)
async def create_scene(
    body: SceneCreateRequest,
    _: AuthenticatedUser = Depends(require_roles("admin", "ec_admin", "md_admin")),
    session: AsyncSession = Depends(get_db_session),
) -> SceneResponse:
    return await ProductAdminService().create_scene(session, body=body)


@router.post("/ontology/ng-rules", response_model=NgRuleResponse)
async def create_ng_rule(
    body: NgRuleCreateRequest,
    _: AuthenticatedUser = Depends(require_roles("admin", "ec_admin", "md_admin")),
    session: AsyncSession = Depends(get_db_session),
) -> NgRuleResponse:
    return await ProductAdminService().create_ng_rule(session, body=body)


@router.get("/analytics/recommendations", response_model=RecommendationAnalyticsResponse)
async def get_recommendation_analytics(
    _: AuthenticatedUser = Depends(require_roles("admin", "ec_admin", "md_admin")),
    session: AsyncSession = Depends(get_db_session),
) -> RecommendationAnalyticsResponse:
    return await AnalyticsService().get_recommendation_analytics(session)
