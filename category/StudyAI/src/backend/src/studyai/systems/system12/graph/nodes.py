from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.agent_graph.tracing import record_step_failure, record_step_start, record_step_success
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system12.repositories.session_repository import SessionRepository
from studyai.systems.system12.schemas.gift import ChatRecommendationItem, ChatRequest, ChatResponse
from studyai.systems.system12.services.conversation_agent import ConversationAgent
from studyai.systems.system12.services.ontology_rule_engine import OntologyRuleEngine
from studyai.systems.system12.services.recommendation_agent import RecommendationAgent
from studyai.systems.system12.services.search_agent import SearchAgent
from studyai.systems.system12.services.session_memory_service import SessionMemoryService


class System12GraphNodes:
    NO_RECOMMENDATION_FOLLOWUP = "現在の条件に合う商品がありません。希望する内容を追加してください。"
    RECOMMENDATION_MESSAGE = "条件に合うギフト候補が見つかりました。"

    def __init__(
        self,
        *,
        session_memory: SessionMemoryService | None = None,
        conversation_agent: ConversationAgent | None = None,
        search_agent: SearchAgent | None = None,
        ontology_rule_engine: OntologyRuleEngine | None = None,
        recommendation_agent: RecommendationAgent | None = None,
    ) -> None:
        self.session_memory = session_memory or SessionMemoryService()
        self.conversation_agent = conversation_agent or ConversationAgent()
        self.search_agent = search_agent or SearchAgent()
        self.ontology_rule_engine = ontology_rule_engine or OntologyRuleEngine()
        self.recommendation_agent = recommendation_agent or RecommendationAgent()

    async def load_session(self, state: dict[str, Any], *, session: AsyncSession) -> dict[str, Any]:
        handle = record_step_start(state, step_name="load_session")
        try:
            request = self._request_from_state(state)
            stored_session = await self.session_memory.load_session(session, request.session_id)
            record_step_success(state, handle=handle, next_step="store_user_message")
            return {"stored_session": stored_session}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="load_session_failed", error_message=str(exc))
            raise

    async def store_user_message(self, state: dict[str, Any], *, session: AsyncSession) -> dict[str, Any]:
        handle = record_step_start(state, step_name="store_user_message")
        try:
            request = self._request_from_state(state)
            await self.session_memory.store_user_message(session, session_id=request.session_id, message=request.message)
            record_step_success(state, handle=handle, next_step="extract_conditions")
            return {}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="store_user_message_failed", error_message=str(exc))
            raise

    async def extract_conditions(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="extract_conditions")
        try:
            request = self._request_from_state(state)
            stored_session = state.get("stored_session")
            existing_conditions = dict(getattr(stored_session, "collected_conditions", {}) or {})
            history = list(getattr(stored_session, "history", []) or [])
            conditions, missing_conditions = await self.conversation_agent.extract_conditions(
                message=request.message,
                existing_conditions=existing_conditions,
                history=history,
            )
            record_step_success(
                state,
                handle=handle,
                next_step="merge_conditions",
                metadata={"missing_count": len(missing_conditions)},
            )
            return {"conditions": conditions, "missing_conditions": missing_conditions}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="extract_conditions_failed", error_message=str(exc))
            raise

    async def merge_conditions(self, state: dict[str, Any], *, session: AsyncSession) -> dict[str, Any]:
        handle = record_step_start(state, step_name="merge_conditions")
        try:
            request = self._request_from_state(state)
            updated_session = await self.session_memory.merge_conditions(
                session,
                session_id=request.session_id,
                conditions=dict(state.get("conditions", {}) or {}),
            )
            record_step_success(state, handle=handle, next_step="judge_missing_conditions")
            return {"updated_session": updated_session}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="merge_conditions_failed", error_message=str(exc))
            raise

    async def judge_missing_conditions(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="judge_missing_conditions")
        try:
            missing_conditions = list(state.get("missing_conditions", []) or [])
            next_step = "build_followup_response" if missing_conditions else "search_candidates"
            record_step_success(
                state,
                handle=handle,
                next_step=next_step,
                metadata={"missing_count": len(missing_conditions)},
            )
            return {"next_step": next_step}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="judge_missing_conditions_failed", error_message=str(exc))
            raise

    async def search_candidates(self, state: dict[str, Any], *, session: AsyncSession) -> dict[str, Any]:
        handle = record_step_start(state, step_name="search_candidates")
        try:
            updated_session = state.get("updated_session")
            conditions = dict(getattr(updated_session, "collected_conditions", {}) or {})
            candidates = await self.search_agent.search_candidates(session, conditions=conditions)
            record_step_success(
                state,
                handle=handle,
                next_step="apply_rules",
                metadata={"candidate_count": len(candidates)},
            )
            return {"candidates": candidates}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="search_candidates_failed", error_message=str(exc))
            raise

    async def apply_rules(self, state: dict[str, Any], *, session: AsyncSession) -> dict[str, Any]:
        handle = record_step_start(state, step_name="apply_rules")
        try:
            updated_session = state.get("updated_session")
            conditions = dict(getattr(updated_session, "collected_conditions", {}) or {})
            filtered_candidates = await self.ontology_rule_engine.apply_rules(
                session,
                conditions=conditions,
                candidates=list(state.get("candidates", []) or []),
            )
            record_step_success(
                state,
                handle=handle,
                next_step="build_recommendations",
                metadata={"filtered_count": len(filtered_candidates)},
            )
            return {"filtered_candidates": filtered_candidates}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="apply_rules_failed", error_message=str(exc))
            raise

    async def build_recommendations(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="build_recommendations")
        try:
            updated_session = state.get("updated_session")
            conditions = dict(getattr(updated_session, "collected_conditions", {}) or {})
            recommendations = await self.recommendation_agent.build_recommendations(
                conditions=conditions,
                candidates=list(state.get("filtered_candidates", []) or []),
            )
            record_step_success(
                state,
                handle=handle,
                next_step="judge_recommendations",
                metadata={"recommendation_count": len(recommendations)},
            )
            return {"recommendations": recommendations}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="build_recommendations_failed", error_message=str(exc))
            raise

    async def judge_recommendations(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="judge_recommendations")
        try:
            recommendations = list(state.get("recommendations", []) or [])
            next_step = "build_recommendation_response" if recommendations else "build_followup_response"
            record_step_success(
                state,
                handle=handle,
                next_step=next_step,
                metadata={"recommendation_count": len(recommendations)},
            )
            return {"next_step": next_step}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="judge_recommendations_failed", error_message=str(exc))
            raise

    async def build_followup_response(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="build_followup_response")
        try:
            request = self._request_from_state(state)
            updated_session = state.get("updated_session")
            collected_conditions = dict(getattr(updated_session, "collected_conditions", {}) or {})
            missing_conditions = list(state.get("missing_conditions", []) or [])
            if missing_conditions:
                message = self.conversation_agent.build_followup_question(missing_conditions)
            else:
                message = self.NO_RECOMMENDATION_FOLLOWUP
                missing_conditions = ["preference"]
            response_payload = ChatResponse(
                session_id=request.session_id,
                response_type="question",
                message=message,
                collected_conditions=collected_conditions,
                missing_conditions=missing_conditions,
                recommendations=[],
            )
            record_step_success(state, handle=handle, next_step="persist_response")
            return {
                "response_type": "question",
                "response_message": message,
                "missing_conditions": missing_conditions,
                "response_payload": response_payload.model_dump(),
            }
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="build_followup_response_failed", error_message=str(exc))
            raise

    async def build_recommendation_response(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="build_recommendation_response")
        try:
            request = self._request_from_state(state)
            updated_session = state.get("updated_session")
            collected_conditions = dict(getattr(updated_session, "collected_conditions", {}) or {})
            recommendations = list(state.get("recommendations", []) or [])
            response_payload = ChatResponse(
                session_id=request.session_id,
                response_type="recommendation",
                message=self.RECOMMENDATION_MESSAGE,
                collected_conditions=collected_conditions,
                missing_conditions=[],
                recommendations=[ChatRecommendationItem(**item) for item in recommendations],
            )
            recommended_ids = [int(item["product_id"]) for item in recommendations]
            record_step_success(state, handle=handle, next_step="persist_response")
            return {
                "response_type": "recommendation",
                "response_message": self.RECOMMENDATION_MESSAGE,
                "missing_conditions": [],
                "recommended_ids": recommended_ids,
                "response_payload": response_payload.model_dump(),
            }
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="build_recommendation_response_failed", error_message=str(exc))
            raise

    async def persist_response(self, state: dict[str, Any], *, session: AsyncSession) -> dict[str, Any]:
        handle = record_step_start(state, step_name="persist_response")
        try:
            request = self._request_from_state(state)
            response_type = str(state.get("response_type") or "")
            response_message = str(state.get("response_message") or "")
            updated_session = state.get("updated_session")
            collected_conditions = dict(getattr(updated_session, "collected_conditions", {}) or {})
            await self.session_memory.store_assistant_message(
                session,
                session_id=request.session_id,
                message=response_message,
            )
            if response_type == "recommendation":
                recommended_ids = list(state.get("recommended_ids", []) or [])
                recommendations = list(state.get("recommendations", []) or [])
                await self.session_memory.store_recommendations(
                    session,
                    session_id=request.session_id,
                    product_ids=recommended_ids,
                )
                await SessionRepository(session).create_log(
                    session_id=request.session_id,
                    conditions=collected_conditions,
                    recommended=recommendations,
                )
            record_step_success(state, handle=handle, next_step="end", metadata={"response_type": response_type})
            return {}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="persist_response_failed", error_message=str(exc))
            raise

    def route_after_missing(self, state: dict[str, Any]) -> str:
        next_step = str(state.get("next_step") or "search_candidates")
        if next_step not in {"search_candidates", "build_followup_response"}:
            return "search_candidates"
        return next_step

    def route_after_recommendations(self, state: dict[str, Any]) -> str:
        next_step = str(state.get("next_step") or "build_followup_response")
        if next_step not in {"build_followup_response", "build_recommendation_response"}:
            return "build_followup_response"
        return next_step

    @staticmethod
    def _request_from_state(state: dict[str, Any]) -> ChatRequest:
        request = state.get("request")
        if not isinstance(request, ChatRequest):
            raise ValidationAppError("missing_request", "Chat request was not found in graph state.")
        return request
