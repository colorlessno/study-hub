from __future__ import annotations

from types import SimpleNamespace

import pytest

from studyai.common.ai.models import JSONExtractionResult
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system02.repositories.review_repository import ReviewRepository
from studyai.systems.system02.services.compare_review_engine import CompareReviewEngine
from studyai.systems.system02.services.review_service import ReviewService
from studyai.systems.system02.services.risk_review_engine import RiskReviewEngine


class FakeLLMClient:
    def __init__(self, responses: list[dict]) -> None:
        self.responses = list(responses)
        self.requests: list[tuple[str, str]] = []
        self.settings = SimpleNamespace(get_llm_model=lambda: "test-local-model")

    async def extract_json_with_metadata(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int | None = None,
        reasoning_effort: str | None = None,
    ) -> JSONExtractionResult:
        self.requests.append((system_prompt, user_prompt))
        assert max_tokens == 512
        assert reasoning_effort == "none"
        return JSONExtractionResult(
            data=self.responses.pop(0),
            raw_output="{}",
            input_tokens=20,
            output_tokens=10,
        )


def generated_review() -> dict:
    return {
        "document_type": "業務委託契約書",
        "issues": [
            {
                "type": "missing",
                "severity": "high",
                "article": "第3条",
                "original_text": "支払条件は別途定める。",
                "description": "支払期限が未定義です。",
                "risk_explanation": "支払時期を確定できないリスクがあります。",
                "suggested_text": "検収月の翌月末までに支払う。",
            }
        ],
    }


@pytest.mark.asyncio
async def test_risk_review_calls_llm_with_perspective_and_validates_output() -> None:
    client = FakeLLMClient([generated_review()])
    engine = RiskReviewEngine(llm_client=client)  # type: ignore[arg-type]

    result = await engine.run_review(
        chunks=[{"article": "第3条", "chunk_text": "支払条件は別途定める。"}],
        perspective="受託者",
    )

    assert result.document_type == "業務委託契約書"
    assert result.model_used == "test-local-model"
    assert result.input_tokens == 20
    assert result.retry_count == 0
    assert len(client.requests) == 1
    assert "受託者" in client.requests[0][1]


@pytest.mark.asyncio
async def test_risk_review_retries_invalid_json_schema_sequentially() -> None:
    client = FakeLLMClient(
        [
            {"document_type": "業務委託契約書", "issues": [{"severity": "unknown"}]},
            generated_review(),
        ]
    )
    engine = RiskReviewEngine(llm_client=client)  # type: ignore[arg-type]

    result = await engine.run_review(
        chunks=[{"article": "第3条", "chunk_text": "支払条件は別途定める。"}],
        perspective="受託者",
    )

    assert result.retry_count == 1
    assert len(client.requests) == 2


@pytest.mark.asyncio
async def test_compare_review_calls_llm_and_validates_diff_types() -> None:
    client = FakeLLMClient(
        [
            {
                "issues": [
                    {
                        "type": "changed",
                        "severity": "medium",
                        "article": "第2条",
                        "original_text": "期間を1年から2年へ変更。",
                        "description": "契約期間が延長されています。",
                        "risk_explanation": "解約可能時期が遅くなるリスクがあります。",
                        "suggested_text": "契約期間を1年とする。",
                    }
                ]
            }
        ]
    )
    engine = CompareReviewEngine(llm_client=client)  # type: ignore[arg-type]

    result = await engine.run_compare(
        [
            {
                "article": "第2条",
                "chunk_a": {"chunk_text": "契約期間は1年とする。"},
                "chunk_b": {"chunk_text": "契約期間は2年とする。"},
            }
        ]
    )

    assert result.issues[0]["type"] == "changed"
    assert len(client.requests) == 1


class FakeSession:
    def __init__(self) -> None:
        self.rows: list[object] = []

    def add(self, row: object) -> None:
        self.rows.append(row)

    async def flush(self) -> None:
        return None


@pytest.mark.asyncio
async def test_repository_does_not_persist_original_clause_text() -> None:
    session = FakeSession()
    repository = ReviewRepository(session)  # type: ignore[arg-type]

    rows = await repository.create_issues(
        1,
        [
            {
                "type": "missing",
                "severity": "high",
                "article": "第3条",
                "original_text": "保存してはいけない原文",
                "description": "支払期限が未定義です。",
                "risk_explanation": "支払時期を確定できないリスクがあります。",
                "suggested_text": "支払期限を定義する。",
            }
        ],
    )

    assert rows[0].original_text is None


def test_review_service_rejects_undefined_perspective() -> None:
    service = ReviewService()

    with pytest.raises(ValidationAppError, match="審査視点"):
        service._validate_perspective("委託側")
