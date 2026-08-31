from __future__ import annotations

import asyncio
from types import SimpleNamespace

from studyai.systems.system12.graph.nodes import System12GraphNodes
from studyai.systems.system12.schemas.gift import ChatRequest


class _FakeSessionMemoryService:
    async def load_session(self, session, session_id: str):
        return SimpleNamespace(session_id=session_id, collected_conditions={}, history=[])

    async def store_user_message(self, session, *, session_id: str, message: str) -> None:
        return None

    async def store_assistant_message(self, session, *, session_id: str, message: str) -> None:
        return None

    async def merge_conditions(self, session, *, session_id: str, conditions: dict):
        return SimpleNamespace(session_id=session_id, collected_conditions=conditions, history=[])

    async def store_recommendations(self, session, *, session_id: str, product_ids: list[int]) -> None:
        return None


class _FakeConversationAgent:
    async def extract_conditions(self, *, message: str, existing_conditions: dict, history: list[dict]):
        return ({**existing_conditions, "scene": "誕生日", "recipient": "母", "budget": 5000}, [])

    def build_followup_question(self, missing_conditions: list[str]) -> str:
        return "予算を教えてください。"


class _FakeSearchAgent:
    async def search_candidates(self, session, *, conditions: dict):
        product = SimpleNamespace(
            id=1,
            name="花ギフト",
            price=4500,
            image_url=None,
            tags=["花"],
            category="フラワー",
            description="gift",
            suitable_scenes=["誕生日"],
            suitable_recipients=["母"],
            attributes={},
            purchase_count=1,
            formality=3,
            embedding=None,
        )
        return [{"product": product, "score": 3.2}]


class _FakeOntologyRuleEngine:
    async def apply_rules(self, session, *, conditions: dict, candidates: list[dict]):
        return candidates


class _FakeRecommendationAgent:
    async def build_recommendations(self, *, conditions: dict, candidates: list[dict]):
        return [
            {
                "rank": 1,
                "product_id": 1,
                "product_name": "花ギフト",
                "price": 4500.0,
                "image_url": None,
                "reason": "条件に合います。",
                "suitable_for": "母向け",
                "cautions": None,
                "wrapping": "標準ラッピング",
                "score": 3.2,
            }
        ]


class _FakeSessionRepository:
    def __init__(self) -> None:
        self.logged = False

    async def create_log(self, *, session_id: str, conditions: dict, recommended: list[dict], feedback: dict | None = None):
        self.logged = True
        return SimpleNamespace(id=1)


def test_graph_nodes_build_recommendation_flow():
    request = ChatRequest(session_id="s1", message="母への誕生日ギフトで5000円くらい")
    nodes = System12GraphNodes(
        session_memory=_FakeSessionMemoryService(),
        conversation_agent=_FakeConversationAgent(),
        search_agent=_FakeSearchAgent(),
        ontology_rule_engine=_FakeOntologyRuleEngine(),
        recommendation_agent=_FakeRecommendationAgent(),
    )
    state = {"request": request, "step_logs": [], "errors": []}

    state.update(asyncio.run(nodes.load_session(state, session=None)))
    state.update(asyncio.run(nodes.store_user_message(state, session=None)))
    state.update(asyncio.run(nodes.extract_conditions(state)))
    state.update(asyncio.run(nodes.merge_conditions(state, session=None)))
    state.update(asyncio.run(nodes.judge_missing_conditions(state)))
    state.update(asyncio.run(nodes.search_candidates(state, session=None)))
    state.update(asyncio.run(nodes.apply_rules(state, session=None)))
    state.update(asyncio.run(nodes.build_recommendations(state)))
    state.update(asyncio.run(nodes.judge_recommendations(state)))
    state.update(asyncio.run(nodes.build_recommendation_response(state)))

    assert state["response_type"] == "recommendation"
    assert state["recommended_ids"] == [1]
    assert state["response_payload"]["recommendations"][0]["product_id"] == 1


def test_graph_nodes_build_followup_for_missing_conditions():
    class _MissingConversationAgent(_FakeConversationAgent):
        async def extract_conditions(self, *, message: str, existing_conditions: dict, history: list[dict]):
            return (existing_conditions, ["budget"])

    request = ChatRequest(session_id="s2", message="母に花を贈りたい")
    nodes = System12GraphNodes(
        session_memory=_FakeSessionMemoryService(),
        conversation_agent=_MissingConversationAgent(),
        search_agent=_FakeSearchAgent(),
        ontology_rule_engine=_FakeOntologyRuleEngine(),
        recommendation_agent=_FakeRecommendationAgent(),
    )
    state = {"request": request, "step_logs": [], "errors": []}

    state.update(asyncio.run(nodes.load_session(state, session=None)))
    state.update(asyncio.run(nodes.extract_conditions(state)))
    state.update(asyncio.run(nodes.merge_conditions(state, session=None)))
    state.update(asyncio.run(nodes.judge_missing_conditions(state)))
    state.update(asyncio.run(nodes.build_followup_response(state)))

    assert state["response_type"] == "question"
    assert state["missing_conditions"] == ["budget"]
    assert state["response_payload"]["response_type"] == "question"
