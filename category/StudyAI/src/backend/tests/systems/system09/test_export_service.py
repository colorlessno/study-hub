from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from studyai.systems.system09.services.export_service import ExportService


def test_export_markdown_builds_sections_from_report() -> None:
    report = SimpleNamespace(
        research_type="競合調査",
        theme="株式会社A",
        targets=["株式会社A", "株式会社B"],
        created_at=datetime(2026, 4, 14, 12, 0, 0),
        executive_summary="summary",
        key_findings=["finding1"],
        companies=[{"name": "株式会社A", "overview": "overview", "products": ["p1"]}],
        trends="trends",
        limitations="limitations",
        markdown=None,
    )
    markdown = ExportService().export_markdown(report)
    assert "# 競合調査 レポート" in markdown
    assert "## 主要発見事項" in markdown
    assert "### 株式会社A" in markdown
