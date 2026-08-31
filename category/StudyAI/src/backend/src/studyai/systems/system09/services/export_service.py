from __future__ import annotations


class ExportService:
    def export_markdown(self, report) -> str:
        if report.markdown:
            return report.markdown

        lines = [
            f"# {report.research_type} レポート",
            "",
            f"- テーマ: {report.theme}",
            f"- 対象: {', '.join(report.targets)}",
            f"- 作成日: {report.created_at.isoformat()}",
            "",
            "## エグゼクティブサマリー",
            report.executive_summary or "",
            "",
            "## 主要発見事項",
        ]
        for finding in report.key_findings:
            lines.append(f"- {finding}")

        lines.extend(["", "## 企業分析"])
        for company in report.companies:
            lines.append(f"### {company.get('name', '')}")
            if company.get("overview"):
                lines.append(company["overview"])
            for key in ("products", "strengths", "weaknesses", "recent_news"):
                values = company.get(key) or []
                if values:
                    lines.append(f"- {key}: {', '.join(values)}")

        lines.extend(["", "## トレンド", report.trends or "", "", "## 制約", report.limitations or ""])
        return "\n".join(lines).strip()
