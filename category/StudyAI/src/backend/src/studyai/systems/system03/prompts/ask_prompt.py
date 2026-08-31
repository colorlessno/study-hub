from __future__ import annotations

import json


def build_ask_prompts(question: str, memory: list[dict], sources: list[dict]) -> tuple[str, str]:
    schema = {
        "answer": "string",
        "confidence": "高 | 中 | 低",
        "sources": [
            {
                "document_name": "string",
                "section": "string or null",
                "excerpt": "string",
            }
        ],
        "related_questions": ["string", "string", "string"],
    }
    system_prompt = (
        "あなたはプロジェクト文書Q&Aシステムの回答AIです。"
        "渡された根拠文書だけを使って回答してください。"
        "根拠が不足する場合は推測せず、『関連文書が不足しているため確定回答できない』と答えてください。"
        "回答は必ずJSONのみで返してください。"
        f"出力スキーマ: {json.dumps(schema, ensure_ascii=False)}"
    )
    user_prompt = (
        f"質問: {question}\n"
        f"会話履歴: {json.dumps(memory, ensure_ascii=False)}\n"
        f"根拠候補: {json.dumps(sources, ensure_ascii=False)}"
    )
    return system_prompt, user_prompt
