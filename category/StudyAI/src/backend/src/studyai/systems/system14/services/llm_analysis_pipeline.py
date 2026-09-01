from __future__ import annotations

import json
from importlib import import_module
from typing import Any, NoReturn, TypedDict

from studyai.common.agent_graph.builders import compile_graph, create_state_graph
from studyai.common.ai.llm_client import LLMClient
from studyai.common.errors.models import ExternalServiceError, ValidationAppError
from studyai.systems.system14.prompts.insight_prompt import ANALYZE_UTTERANCE_SYSTEM_PROMPT


class _AnalysisState(TypedDict, total=False):
    speaker: str
    text: str
    raw_analysis: dict[str, Any]
    analysis: dict[str, Any]


class LLMAnalysisPipeline:
    """一発話をLangGraphの固定ノード順に従ってLM Studioで分析する。"""

    SENTIMENTS = {"positive", "negative", "neutral"}
    UTTERANCE_TYPES = {"クレーム", "要望", "質問", "お褒め", "その他"}
    URGENCIES = {"low", "high"}

    def __init__(self, *, llm_client: LLMClient | None = None) -> None:
        self.llm_client = llm_client or LLMClient()
        self.compiled_graph = self._build_graph()

    async def analyze_utterance(self, *, speaker: str | None, text: str) -> dict[str, Any]:
        normalized_text = text.strip()
        if not normalized_text:
            raise ValidationAppError("empty_utterance", "発話本文を入力してください。")

        state = await self.compiled_graph.ainvoke(
            {
                "speaker": speaker or "unknown",
                "text": normalized_text,
            }
        )
        return dict(state["analysis"])

    def _build_graph(self):
        graph_module = import_module("langgraph.graph")
        start = getattr(graph_module, "START")
        end = getattr(graph_module, "END")
        graph = create_state_graph(_AnalysisState)
        graph.add_node("request_llm", self._request_llm)
        graph.add_node("validate_output", self._validate_output)
        graph.add_edge(start, "request_llm")
        graph.add_edge("request_llm", "validate_output")
        graph.add_edge("validate_output", end)
        return compile_graph(graph)

    async def _request_llm(self, state: _AnalysisState) -> dict[str, Any]:
        user_prompt = json.dumps(
            {
                "speaker": state["speaker"],
                "text": state["text"],
            },
            ensure_ascii=False,
        )
        raw_analysis = await self.llm_client.extract_json(
            ANALYZE_UTTERANCE_SYSTEM_PROMPT,
            user_prompt,
        )
        return {"raw_analysis": raw_analysis}

    def _validate_output(self, state: _AnalysisState) -> dict[str, Any]:
        value = state.get("raw_analysis")
        if not isinstance(value, dict):
            self._invalid("分析結果がJSON objectではありません。")

        sentiment = value.get("sentiment")
        utterance_type = value.get("utterance_type")
        urgency = value.get("urgency")
        topics = value.get("topics")
        if sentiment not in self.SENTIMENTS:
            self._invalid("sentimentが許可値ではありません。")
        if utterance_type not in self.UTTERANCE_TYPES:
            self._invalid("utterance_typeが許可値ではありません。")
        if urgency not in self.URGENCIES:
            self._invalid("urgencyが許可値ではありません。")
        if not isinstance(topics, list) or not topics or len(topics) > 3:
            self._invalid("topicsは1件以上3件以下の配列にしてください。")
        normalized_topics = [str(topic).strip() for topic in topics]
        if any(not topic for topic in normalized_topics):
            self._invalid("topicsに空文字は使用できません。")

        try:
            sentiment_score = float(value.get("sentiment_score"))
        except (TypeError, ValueError):
            self._invalid("sentiment_scoreは数値にしてください。")
        if not -1.0 <= sentiment_score <= 1.0:
            self._invalid("sentiment_scoreは-1.0から1.0の範囲にしてください。")

        return {
            "analysis": {
                "speaker": state["speaker"],
                "text": state["text"],
                "sentiment": sentiment,
                "sentiment_score": round(sentiment_score, 2),
                "utterance_type": utterance_type,
                "topics": normalized_topics,
                "urgency": urgency,
            }
        }

    @staticmethod
    def _invalid(message: str) -> NoReturn:
        raise ExternalServiceError("invalid_model_output", message, 422)
