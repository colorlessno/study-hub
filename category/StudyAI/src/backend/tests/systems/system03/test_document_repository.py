from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

from studyai.systems.system03.repositories.document_repository import DocumentRepository


class RecordingSession:
    def __init__(self) -> None:
        self.events: list[tuple[str, object | None]] = []

    async def execute(self, statement: object) -> None:
        self.events.append(("delete", statement))

    async def flush(self) -> None:
        self.events.append(("flush", None))

    def add_all(self, instances: list[object]) -> None:
        self.events.append(("add_all", instances))


def test_replace_chunks_deletes_existing_rows_before_inserting_replacements() -> None:
    session = RecordingSession()
    repository = DocumentRepository(session)  # type: ignore[arg-type]
    repository.get_by_id = AsyncMock(return_value=object())

    asyncio.run(
        repository.replace_chunks(
            7,
            [
                {
                    "chunk_no": 1,
                    "section_title": "概要",
                    "chunk_text": "更新後の本文",
                    "embedding": [0.1, 0.2],
                }
            ],
        )
    )

    repository.get_by_id.assert_awaited_once_with(7)
    assert [event[0] for event in session.events] == ["delete", "flush", "add_all", "flush"]
    inserted = session.events[2][1]
    assert isinstance(inserted, list)
    assert len(inserted) == 1
    assert inserted[0].document_id == 7
    assert inserted[0].chunk_no == 1
