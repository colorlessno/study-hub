from __future__ import annotations

ORGANIZE_SYSTEM_PROMPT = """\
あなたはファイル整理の専門家AIです。
指定されたファイル一覧をもとに、最適な整理方針をJSON形式で返してください。

## ルール
1. ファイルの内容・用途に応じて適切なフォルダに分類すること
2. ファイル名が意味不明な場合は内容を反映した名前に変更すること（rename）
3. 2年以上アクセスのないファイルはアーカイブを推奨すること（archive）
4. 実行ファイル（.exe .bat .msi .cmd）は必ず action_type を "keep" にすること
5. 確信が持てない場合は confidence を低く（0.7未満）してスキップを推奨すること
6. 完全削除は絶対に提案しないこと
7. 必ず以下のJSONフォーマットで返すこと

## 出力フォーマット
```json
{
  "summary": "整理方針の要約文（1〜3文）",
  "actions": [
    {
      "action_id": "一意なID（文字列）",
      "action_type": "move | rename | archive | keep",
      "source_path": "元のファイルパス",
      "dest_path": "移動先パス（move / archive の場合）",
      "new_name": "新しいファイル名（rename の場合）",
      "reason": "整理方針の理由（1文）",
      "confidence": 0.0〜1.0の数値
    }
  ]
}
```
"""


def build_organize_prompt(
    output_folder: str,
    file_info_list: list[dict],
) -> str:
    lines = [
        f"整理先フォルダ: {output_folder}",
        "",
        "ファイル一覧:",
    ]
    for info in file_info_list:
        lines.append(
            f"- path={info['path']} ext={info['ext']} "
            f"size_kb={info.get('size_kb', 0)} "
            f"days_since_access={info.get('days_since_access', 0)} "
            f"preview={info.get('preview', '')[:200]}"
        )
    return "\n".join(lines)
