from __future__ import annotations

from types import SimpleNamespace

from studyai.systems.system05.services.suggestion_service import SuggestionService


def test_suggestion_service_uses_recent_record() -> None:
    service = SuggestionService()
    recent = [
        SimpleNamespace(menu="整体60分", soap_plan="肩甲骨ストレッチを継続する。"),
    ]

    suggestion = service.build_next_visit_suggestion(
        patient_name="山田太郎",
        contraindications="強い刺激は避ける",
        recent_records=recent,
    )

    assert suggestion.recommended_menu == "整体60分"
    assert "山田太郎" in suggestion.reason
    assert suggestion.cautions == ["強い刺激は避ける"]
