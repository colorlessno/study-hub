from __future__ import annotations

import pytest

from studyai.common.errors.models import ExternalServiceError
from studyai.systems.system14.services.llm_analysis_pipeline import LLMAnalysisPipeline


class _FakeLLMClient:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.requests: list[tuple[str, str]] = []

    async def extract_json(self, system_prompt: str, user_prompt: str) -> dict:
        self.requests.append((system_prompt, user_prompt))
        return self.payload


@pytest.mark.asyncio
async def test_llm_analysis_pipeline_returns_validated_analysis() -> None:
    client = _FakeLLMClient(
        {
            "sentiment": "negative",
            "sentiment_score": -0.82,
            "utterance_type": "クレーム",
            "topics": ["配送", "納期"],
            "urgency": "high",
        }
    )
    pipeline = LLMAnalysisPipeline(llm_client=client)

    result = await pipeline.analyze_utterance(
        speaker="customer",
        text="配送が遅く、至急確認が必要です。",
    )

    assert result == {
        "speaker": "customer",
        "text": "配送が遅く、至急確認が必要です。",
        "sentiment": "negative",
        "sentiment_score": -0.82,
        "utterance_type": "クレーム",
        "topics": ["配送", "納期"],
        "urgency": "high",
    }
    assert len(client.requests) == 1


@pytest.mark.asyncio
async def test_llm_analysis_pipeline_rejects_invalid_output_without_rule_fallback() -> None:
    pipeline = LLMAnalysisPipeline(
        llm_client=_FakeLLMClient(
            {
                "sentiment": "negative",
                "sentiment_score": -0.7,
                "utterance_type": "クレーム",
                "topics": [],
                "urgency": "high",
            }
        )
    )

    with pytest.raises(ExternalServiceError) as exc_info:
        await pipeline.analyze_utterance(speaker="customer", text="至急確認してください。")

    assert exc_info.value.error_code == "invalid_model_output"
