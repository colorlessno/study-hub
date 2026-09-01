from __future__ import annotations

import asyncio
import json
from datetime import datetime
from types import SimpleNamespace

from studyai.systems.system14.schemas.insight import PerformanceRunRequest
from studyai.systems.system14.services import performance_service as performance_module
from studyai.systems.system14.services.performance_service import PerformanceService


class _FakeSession:
    committed = False

    async def commit(self) -> None:
        self.committed = True


class _FakeJobManager:
    calls: list[dict] = []

    async def upload_data(self, _session: object, **values: object) -> SimpleNamespace:
        self.__class__.calls.append(dict(values))
        return SimpleNamespace(job_id="job_performance", status="completed")


class _FakeRepository:
    created_values: dict = {}

    def __init__(self, _session: object) -> None:
        pass

    async def count_job_records(self, *, job_id: str) -> tuple[int, int]:
        assert job_id == "job_performance"
        return 100, 100

    async def get_job(self, job_id: str) -> SimpleNamespace:
        assert job_id == "job_performance"
        return SimpleNamespace(error_message=None)

    async def create_performance_run(self, **values: object) -> SimpleNamespace:
        self.__class__.created_values = dict(values)
        return SimpleNamespace(
            id=7,
            created_at=datetime(2026, 9, 1, 21, 0, 0),
            **values,
        )

    async def list_performance_runs(self, *, limit: int) -> list[SimpleNamespace]:
        assert limit == 5
        return [
            SimpleNamespace(
                id=8,
                job_id="job_history",
                requested_conversations=200,
                processed_conversations=200,
                processed_utterances=200,
                target_seconds=30.0,
                elapsed_seconds=4.0,
                conversations_per_second=50.0,
                status="completed",
                target_met=True,
                error_message=None,
                created_at=datetime(2026, 9, 1, 21, 1, 0),
                completed_at=datetime(2026, 9, 1, 21, 1, 4),
            )
        ]


def test_performance_validation_uses_existing_ingestion_and_persists_metrics(monkeypatch) -> None:
    _FakeJobManager.calls.clear()
    _FakeRepository.created_values = {}
    session = _FakeSession()
    timer_values = iter([10.0, 12.0])
    monkeypatch.setattr(performance_module, "JobManager", _FakeJobManager)
    monkeypatch.setattr(performance_module, "InsightRepository", _FakeRepository)
    monkeypatch.setattr(performance_module, "perf_counter", lambda: next(timer_values))

    response = asyncio.run(
        PerformanceService().run(
            session,
            body=PerformanceRunRequest(conversation_count=100, target_seconds=5.0),
        )
    )

    assert session.committed is True
    assert len(_FakeJobManager.calls) == 1
    call = _FakeJobManager.calls[0]
    assert call["source"] == "performance_validation"
    assert call["analysis_mode"] == "rules"
    payload = json.loads(call["file_bytes"].decode("utf-8"))
    assert len(payload["items"]) == 100
    assert payload["items"][0]["text"].endswith("受付番号は1です。")
    assert payload["items"][-1]["text"].endswith("受付番号は100です。")
    assert response.processed_conversations == 100
    assert response.processed_utterances == 100
    assert response.elapsed_seconds == 2.0
    assert response.conversations_per_second == 50.0
    assert response.target_met is True
    assert _FakeRepository.created_values["job_id"] == "job_performance"


def test_performance_history_returns_saved_runs(monkeypatch) -> None:
    monkeypatch.setattr(performance_module, "InsightRepository", _FakeRepository)

    response = asyncio.run(PerformanceService().list_runs(object(), limit=5))

    assert len(response.runs) == 1
    assert response.runs[0].job_id == "job_history"
    assert response.runs[0].target_met is True


def test_performance_rows_are_generated_in_input_order() -> None:
    rows = PerformanceService._build_rows(100)

    assert [row["text"] for row in rows[:3]] == [
        "商品Aに関する一般的な問い合わせです。受付番号は1です。",
        "商品Aに関する一般的な問い合わせです。受付番号は2です。",
        "商品Aに関する一般的な問い合わせです。受付番号は3です。",
    ]
