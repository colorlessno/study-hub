from __future__ import annotations

import asyncio

from studyai.systems.system08.schemas.analysis import AnalysisCreateRequest
from studyai.systems.system08.services.task_generator import TaskGenerator


class _SlowLLMClient:
    async def extract_json(self, system_prompt: str, user_prompt: str) -> dict:
        await asyncio.sleep(0.05)
        return {"summary": "late", "tasks": []}


def test_task_generator_uses_fallback_when_model_exceeds_time_limit():
    generator = TaskGenerator()
    generator.llm_client = _SlowLLMClient()
    generator.MODEL_TIMEOUT_SECONDS = 0.01

    result = asyncio.run(
        generator.generate_tasks(
            AnalysisCreateRequest(theme="Docker本番運用", role="プロジェクトリーダー"),
            sources=[
                {
                    "title": "入力情報",
                    "url": "https://local/input",
                    "content": "本番運用の準備作業を整理する。",
                }
            ],
        )
    )

    assert result["summary"] == "Docker本番運用 を進めるための初期タスクを整理しました。"
    assert len(result["tasks"]) == 6
