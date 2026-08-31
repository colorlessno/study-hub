from __future__ import annotations

import asyncio

from studyai.common.ai.llm_client import LLMClient
from studyai.systems.system09.prompts.research_prompt import build_report_prompt
from studyai.systems.system09.schemas.research import (
    CompanyReport,
    ComparisonTable,
    ResearchRequest,
    SWOTReport,
)


class ReportComposer:
    MODEL_TIMEOUT_SECONDS = 60.0

    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def compose_report(self, request: ResearchRequest, sources: list[dict]) -> dict:
        if sources and all(source.get("source_type") == "request" for source in sources):
            return self._fallback_report(request, sources)
        system_prompt, user_prompt = build_report_prompt(request, sources)
        try:
            raw = await asyncio.wait_for(
                self.llm_client.extract_json(system_prompt, user_prompt),
                timeout=self.MODEL_TIMEOUT_SECONDS,
            )
            companies = [
                CompanyReport(**item).model_dump()
                for item in raw.get("companies", [])
                if isinstance(item, dict)
            ]
            comparison = ComparisonTable(**(raw.get("comparison_table") or {})).model_dump()
            swot = SWOTReport(**(raw.get("swot") or {})).model_dump()
        except Exception:
            return self._fallback_report(request, sources)
        return {
            "executive_summary": str(raw.get("executive_summary") or ""),
            "key_findings": [str(item) for item in raw.get("key_findings", [])][:10],
            "companies": companies,
            "comparison_table": comparison,
            "swot": swot,
            "trends": str(raw.get("trends") or ""),
            "limitations": str(raw.get("limitations") or "This report uses public web sources only."),
        }

    @staticmethod
    def _fallback_report(request: ResearchRequest, sources: list[dict]) -> dict:
        external_sources = [source for source in sources if source.get("source_type") != "request"]
        source_urls = [str(source.get("url") or "") for source in sources if source.get("url")]
        source_titles = [str(source.get("title") or "") for source in external_sources if source.get("title")]
        if external_sources:
            overview = "公開情報を収集しました。AIによる構造化が完了しなかったため、出典を直接確認してください。"
            summary = "公開情報の収集は完了しました。AIによるレポート構造化が制限時間内に完了しなかったため、出典を中心に確認してください。"
            limitation = "AIによる構造化が完了していない暫定レポートです。公開情報の更新日と正確性を確認してください。"
        else:
            overview = "外部の公開情報を取得できなかったため、入力された調査条件だけを記録しています。"
            summary = "外部の公開情報を取得できませんでした。入力条件を保存した暫定レポートです。通信状態を確認して再実行してください。"
            limitation = "外部の公開情報を含まない暫定レポートです。調査結果として使用せず、通信状態を確認して再実行してください。"
        companies = [
            CompanyReport(
                name=target,
                overview=overview,
                recent_news=source_titles[:3],
                sources=source_urls if external_sources else [f"local://research-input/{index}"],
            ).model_dump()
            for index, target in enumerate(request.targets, start=1)
        ]
        comparison = ComparisonTable(
            headers=["対象", "確認結果"],
            rows=[
                [target, "収集した公開情報と出典を確認してください。" if external_sources else "公開情報を取得できませんでした。"]
                for target in request.targets
            ],
        ).model_dump()
        if external_sources:
            swot = SWOTReport(
                strengths=["公開情報を収集済み"],
                weaknesses=["AIによる構造化が未完了"],
                opportunities=["出典を基に追加調査できる"],
                threats=["情報の更新時期と正確性を別途確認する必要がある"],
            ).model_dump()
            trends = "収集した出典の内容を確認してください。"
        else:
            swot = SWOTReport(
                strengths=["入力した調査条件を保存済み"],
                weaknesses=["公開情報を取得できていない"],
                opportunities=["通信状態の回復後に再調査できる"],
                threats=["暫定レポートを調査結果として使用できない"],
            ).model_dump()
            trends = "公開情報を取得後に確認してください。"
        return {
            "executive_summary": summary,
            "key_findings": source_titles[:10] or ["外部の公開情報を取得できませんでした。"],
            "companies": companies,
            "comparison_table": comparison,
            "swot": swot,
            "trends": trends,
            "limitations": limitation,
        }
