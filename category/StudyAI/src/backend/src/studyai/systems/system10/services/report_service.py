from __future__ import annotations

from datetime import datetime

from studyai.systems.system10.schemas.indexing import ReportResponse


class ReportService:
    def build_report(self, *, report_id: int, indexed_files: list, duplicate_groups: list, issues: list[str]) -> ReportResponse:
        document_map: dict[str, list[dict[str, str]]] = {}
        for item in indexed_files[:50]:
            key = item.doc_type or "その他"
            document_map.setdefault(key, []).append(
                {
                    "file_name": item.file_name,
                    "path": item.full_path,
                }
            )

        recent_updates = [
            {
                "file_name": item.file_name,
                "updated_at": item.updated_at.isoformat() if item.updated_at else "",
                "path": item.full_path,
            }
            for item in indexed_files[:10]
        ]
        duplicate_items = [
            {
                "group": item.file_ids,
                "recommendation": f"latest_file_id={item.latest_file_id} を基準に整理してください。",
            }
            for item in duplicate_groups
        ]
        overview = f"スキャン対象ファイル {len(indexed_files)} 件、重複候補 {len(duplicate_groups)} 件です。"
        markdown_lines = [
            "# プロジェクトドキュメント可視化レポート",
            "",
            f"- 生成日時: {datetime.utcnow().isoformat()}Z",
            f"- 対象ファイル数: {len(indexed_files)}",
            f"- 重複候補数: {len(duplicate_groups)}",
            "",
            "## 最近更新されたファイル",
        ]
        for item in recent_updates:
            markdown_lines.append(f"- {item['file_name']} ({item['path']})")
        if issues:
            markdown_lines.append("")
            markdown_lines.append("## 注意点")
            for issue in issues:
                markdown_lines.append(f"- {issue}")

        return ReportResponse(
            report_id=report_id,
            generated_at=datetime.utcnow(),
            overview=overview,
            document_map=document_map,
            recent_updates=recent_updates,
            duplicates=duplicate_items,
            issues=issues,
            markdown="\n".join(markdown_lines),
        )
