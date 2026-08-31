from __future__ import annotations

from studyai.systems.system05.schemas.medical import SuggestionResponse


class SuggestionService:
    def build_next_visit_suggestion(self, *, patient_name: str, contraindications: str | None, recent_records: list) -> SuggestionResponse:
        if recent_records:
            latest = recent_records[0]
            reason = f"{patient_name} の直近カルテでは {latest.menu} を実施しているため、継続評価を前提に調整します。"
            home_care = latest.soap_plan
        else:
            reason = f"{patient_name} は初回または履歴が少ないため、標準評価から始めます。"
            home_care = None
        cautions = []
        if contraindications:
            cautions.append(contraindications)
        return SuggestionResponse(
            recommended_menu=(recent_records[0].menu if recent_records else "整体60分"),
            reason=reason,
            cautions=cautions,
            target_interval_days=7 if recent_records else 14,
            home_care=home_care,
        )
