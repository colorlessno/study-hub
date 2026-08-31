from __future__ import annotations

import json


def build_tagging_prompt(document_text: str, existing_tags: list[str]) -> tuple[str, str]:
    schema = {
        "category": "string",
        "sub_category": "string",
        "document_type": "string",
        "importance": "高 | 中 | 低",
        "tags": ["string"],
        "summary": "string",
    }
    system_prompt = (
        "あなたはプロジェクト文書の自動分類AIです。"
        "渡された文書本文からカテゴリ、文書種別、重要度、タグ、要約をJSONで返してください。"
        "タグは既存タグとの整合を優先し、10件以内に絞ってください。"
        f"出力スキーマ: {json.dumps(schema, ensure_ascii=False)}"
    )
    user_prompt = (
        f"既存タグ一覧: {json.dumps(existing_tags, ensure_ascii=False)}\n"
        f"文書本文:\n{document_text[:12000]}"
    )
    return system_prompt, user_prompt
