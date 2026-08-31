from __future__ import annotations


def build_file_summary_prompt(file_name: str, file_content: str) -> tuple[str, str]:
    system_prompt = (
        "あなたはプロジェクト文書・ソースコード索引化のための分類器です。"
        "入力テキストを読み、必ず JSON で返答してください。"
    )
    user_prompt = f"""
対象ファイル: {file_name}

本文:
{file_content[:8000]}

以下の JSON 形式で返答してください。
{{
  "doc_type": "要件定義/設計書/議事録/ソースコード/設定ファイル/その他",
  "summary": "120文字以内の要約",
  "is_latest": true
}}
""".strip()
    return system_prompt, user_prompt
