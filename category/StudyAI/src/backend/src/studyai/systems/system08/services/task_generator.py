from __future__ import annotations

import asyncio

from studyai.common.ai.llm_client import LLMClient

from studyai.systems.system08.prompts.task_agent_prompt import TASK_GENERATOR_PROMPT
from studyai.systems.system08.schemas.analysis import AnalysisCreateRequest


class TaskGenerator:
    MODEL_TIMEOUT_SECONDS = 60.0

    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def generate_tasks(
        self,
        body: AnalysisCreateRequest,
        *,
        sources: list[dict],
    ) -> dict:
        fallback = self._fallback_payload(body, sources)
        user_prompt = (
            f"テーマ: {body.theme}\n"
            f"背景: {body.background or 'なし'}\n"
            f"現状: {body.current_status or 'なし'}\n"
            f"制約: {body.constraints or 'なし'}\n"
            f"役割: {body.role or 'なし'}\n"
            f"深さ: {body.depth}\n"
            f"検索結果要約: {self._compact_sources(sources)}\n"
            "summary と tasks 配列を JSON 形式で返してください。"
        )
        try:
            payload = await asyncio.wait_for(
                self.llm_client.extract_json(TASK_GENERATOR_PROMPT, user_prompt),
                timeout=self.MODEL_TIMEOUT_SECONDS,
            )
            return self._normalize_payload(payload, sources) or fallback
        except Exception:
            return fallback

    def _compact_sources(self, sources: list[dict]) -> str:
        parts: list[str] = []
        for source in sources[:6]:
            title = str(source.get("title") or "").strip()
            content = str(source.get("content") or source.get("snippet") or "").strip()
            if not title and not content:
                continue
            parts.append(f"- {title}: {content[:250]}")
        return "\n".join(parts) if parts else "- 情報なし"

    def _normalize_payload(self, payload: dict, sources: list[dict]) -> dict | None:
        tasks = payload.get("tasks")
        if not isinstance(tasks, list) or not tasks:
            return None
        normalized_tasks: list[dict] = []
        for index, item in enumerate(tasks, start=1):
            if not isinstance(item, dict):
                continue
            normalized_tasks.append(
                {
                    "task_no": index,
                    "name": str(item.get("name") or f"タスク {index}"),
                    "description": str(item.get("description") or "作業内容を整理する。"),
                    "category": str(item.get("category") or "計画・設計"),
                    "urgency": self._normalize_level(item.get("urgency")),
                    "importance": self._normalize_level(item.get("importance")),
                    "dependencies": self._normalize_dependencies(item.get("dependencies")),
                    "estimated_hours": self._normalize_hours(item.get("estimated_hours")),
                    "assignee_skill": self._normalize_text(item.get("assignee_skill")),
                    "cautions": self._normalize_text(item.get("cautions")),
                    "references": self._normalize_references(item.get("references"), sources),
                    "confidence": self._normalize_confidence(item.get("confidence")),
                    "evidence": self._normalize_references(item.get("evidence"), sources),
                    "status": "todo",
                }
            )
        if not normalized_tasks:
            return None
        return {
            "summary": str(payload.get("summary") or "検索結果に基づいてタスクを整理しました。"),
            "tasks": normalized_tasks,
        }

    def _fallback_payload(self, body: AnalysisCreateRequest, sources: list[dict]) -> dict:
        references = self._normalize_references(None, sources)
        return {
            "summary": f"{body.theme} を進めるための初期タスクを整理しました。",
            "tasks": [
                {
                    "task_no": 1,
                    "name": "現状確認と前提整理",
                    "description": "背景、現状、制約を整理し、着手条件を明確にする。",
                    "category": "情報収集・現状把握",
                    "urgency": "high",
                    "importance": "high",
                    "dependencies": [],
                    "estimated_hours": 2.0,
                    "assignee_skill": body.role or "PM",
                    "cautions": "認識違いを避けるため、関係者合意を取る。",
                    "references": references,
                    "confidence": "medium",
                    "evidence": references,
                    "status": "todo",
                },
                {
                    "task_no": 2,
                    "name": "作業計画と優先順位決定",
                    "description": "必要作業を洗い出し、先行条件と優先順位を定める。",
                    "category": "計画・設計",
                    "urgency": "high",
                    "importance": "high",
                    "dependencies": [1],
                    "estimated_hours": 2.0,
                    "assignee_skill": "PM",
                    "cautions": "依存関係が曖昧なまま進めない。",
                    "references": references,
                    "confidence": "medium",
                    "evidence": references,
                    "status": "todo",
                },
                {
                    "task_no": 3,
                    "name": "実行環境と必要素材の準備",
                    "description": "必要なアカウント、ツール、入力資料を揃える。",
                    "category": "環境構築・準備",
                    "urgency": "medium",
                    "importance": "high",
                    "dependencies": [2],
                    "estimated_hours": 3.0,
                    "assignee_skill": "実務担当",
                    "cautions": "不足素材があれば早めに補完する。",
                    "references": references,
                    "confidence": "low",
                    "evidence": references,
                    "status": "todo",
                },
                {
                    "task_no": 4,
                    "name": "中間成果の確認",
                    "description": "初期成果物を確認し、方向性のズレを是正する。",
                    "category": "レビュー・調整",
                    "urgency": "medium",
                    "importance": "medium",
                    "dependencies": [2, 3],
                    "estimated_hours": 1.5,
                    "assignee_skill": body.role or "レビュアー",
                    "cautions": "レビュー観点を先に定義しておく。",
                    "references": references,
                    "confidence": "medium",
                    "evidence": references,
                    "status": "todo",
                },
                {
                    "task_no": 5,
                    "name": "リスクと未確定事項の洗い出し",
                    "description": "失敗要因、ボトルネック、意思決定待ち項目を整理する。",
                    "category": "リスク管理",
                    "urgency": "medium",
                    "importance": "high",
                    "dependencies": [1, 2],
                    "estimated_hours": 1.5,
                    "assignee_skill": "PM",
                    "cautions": "未確定事項を放置しない。",
                    "references": references,
                    "confidence": "medium",
                    "evidence": references,
                    "status": "todo",
                },
                {
                    "task_no": 6,
                    "name": "完了条件の定義",
                    "description": "何をもって完了とするかを定義し、引き継ぎ条件を整理する。",
                    "category": "テスト・検証",
                    "urgency": "low",
                    "importance": "medium",
                    "dependencies": [4, 5],
                    "estimated_hours": 1.0,
                    "assignee_skill": "PM",
                    "cautions": "検収条件を先に決める。",
                    "references": references,
                    "confidence": "low",
                    "evidence": references,
                    "status": "todo",
                },
            ],
        }

    @staticmethod
    def _normalize_level(value: object) -> str:
        text = str(value or "").strip().casefold()
        mapping = {
            "高": "high",
            "高い": "high",
            "high": "high",
            "中": "medium",
            "普通": "medium",
            "medium": "medium",
            "低": "low",
            "低い": "low",
            "low": "low",
        }
        return mapping.get(text, "medium")

    @staticmethod
    def _normalize_dependencies(value: object) -> list[int]:
        if not isinstance(value, list):
            return []
        normalized: list[int] = []
        for item in value:
            try:
                normalized.append(int(item))
            except (TypeError, ValueError):
                continue
        return normalized

    @staticmethod
    def _normalize_hours(value: object) -> float | None:
        if value in (None, ""):
            return None
        try:
            return round(float(value), 1)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_text(value: object) -> str | None:
        text = str(value or "").strip()
        return text or None

    def _normalize_references(self, value: object, sources: list[dict]) -> list[dict]:
        if isinstance(value, list):
            normalized: list[dict] = []
            for item in value:
                if not isinstance(item, dict):
                    continue
                title = str(item.get("title") or "").strip()
                url = str(item.get("url") or "").strip()
                if title and url:
                    normalized.append({"title": title, "url": url})
            if normalized:
                return normalized[:5]
        fallback: list[dict] = []
        for source in sources[:5]:
            title = str(source.get("title") or "").strip()
            url = str(source.get("url") or "").strip()
            if title and url:
                fallback.append({"title": title, "url": url})
        return fallback

    @staticmethod
    def _normalize_confidence(value: object) -> str:
        text = str(value or "").strip().casefold()
        mapping = {
            "高": "high",
            "high": "high",
            "中": "medium",
            "medium": "medium",
            "低": "low",
            "low": "low",
        }
        return mapping.get(text, "medium")
