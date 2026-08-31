from __future__ import annotations

from studyai.systems.system07.repositories.tag_repository import TagRepository


def test_normalize_tag_name_casefolds_and_trims() -> None:
    assert TagRepository.normalize_tag_name("  FastAPI  ") == "fastapi"
    assert TagRepository.normalize_tag_name(" 設計書 ") == "設計書"
