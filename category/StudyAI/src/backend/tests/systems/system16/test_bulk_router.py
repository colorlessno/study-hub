from __future__ import annotations

from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import UploadFile

from studyai.systems.system16.api.router import match_bulk
from studyai.systems.system16.schemas.matching import BulkMatchResponse
from studyai.systems.system16.services.matching_service import MatchingService


def candidate_files(count: int) -> list[UploadFile]:
    return [
        UploadFile(file=BytesIO(f"candidate-{index}".encode()), filename=f"candidate-{index}.xlsx")
        for index in range(count)
    ]


@pytest.mark.asyncio
async def test_bulk_match_processes_50_candidates_sequentially(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, int] = {}

    async def fake_match_bulk(self, session, **kwargs):
        captured["count"] = len(kwargs["candidates"])
        return BulkMatchResponse(bulk_id=1, total_candidates=captured["count"], results=[])

    monkeypatch.setattr(MatchingService, "match_bulk", fake_match_bulk)
    result = await match_bulk(
        request=SimpleNamespace(state=SimpleNamespace(trace_id="trace-sync")),
        requirement_text="Java案件",
        requirement_file=None,
        candidate_files=candidate_files(50),
        current_user=SimpleNamespace(user_id="learner"),
        session=object(),
    )

    assert isinstance(result, BulkMatchResponse)
    assert captured["count"] == 50


@pytest.mark.asyncio
async def test_bulk_match_processes_more_than_50_candidates_sequentially(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, int] = {}

    async def fake_match_bulk(self, session, **kwargs):
        captured["count"] = len(kwargs["candidates"])
        return BulkMatchResponse(bulk_id=2, total_candidates=captured["count"], results=[])

    monkeypatch.setattr(MatchingService, "match_bulk", fake_match_bulk)
    result = await match_bulk(
        request=SimpleNamespace(state=SimpleNamespace(trace_id="trace-sequential")),
        requirement_text="Java案件",
        requirement_file=None,
        candidate_files=candidate_files(51),
        current_user=SimpleNamespace(user_id="learner"),
        session=object(),
    )

    assert isinstance(result, BulkMatchResponse)
    assert captured["count"] == 51
