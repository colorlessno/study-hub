from __future__ import annotations

import json


class ExportService:
    def export_markdown(self, analysis) -> str:
        lines = [
            f"# {self._attr(analysis, 'theme')}",
            "",
            "## 概要",
            self._attr(analysis, "summary") or "",
            "",
            "## 優先順タスク",
        ]
        for task in self._tasks(analysis):
            lines.extend(
                [
                    f"### {self._attr(task, 'task_no')}. {self._attr(task, 'name')}",
                    f"- 優先度: {self._attr(task, 'priority')}",
                    f"- 象限: {self._attr(task, 'quadrant')}",
                    f"- 状態: {self._attr(task, 'status')}",
                    f"- 想定工数: {self._attr(task, 'estimated_hours') or ''}",
                    f"- 説明: {self._attr(task, 'description')}",
                ]
            )
            references = self._attr(task, "references") or []
            if references:
                lines.append("- 参照:")
                for ref in references:
                    title = self._attr(ref, "title")
                    url = self._attr(ref, "url")
                    if title and url:
                        lines.append(f"  - [{title}]({url})")
            lines.append("")
        return "\n".join(lines).strip()

    def export_csv(self, analysis) -> str:
        lines = [
            "task_no,name,category,priority,quadrant,status,estimated_hours,dependencies"
        ]
        for task in self._tasks(analysis):
            dependencies = "|".join(str(item) for item in (self._attr(task, "dependencies") or []))
            fields = [
                self._attr(task, "task_no"),
                self._attr(task, "name"),
                self._attr(task, "category"),
                self._attr(task, "priority"),
                self._attr(task, "quadrant"),
                self._attr(task, "status"),
                self._attr(task, "estimated_hours"),
                dependencies,
            ]
            escaped = [self._escape_csv(field) for field in fields]
            lines.append(",".join(escaped))
        return "\n".join(lines)

    def export_json(self, analysis) -> str:
        payload = {
            "analysis_id": self._attr(analysis, "id"),
            "theme": self._attr(analysis, "theme"),
            "summary": self._attr(analysis, "summary"),
            "search_count": self._attr(analysis, "search_count"),
            "priority_summary": self._attr(analysis, "priority_summary") or {},
            "tasks": [
                {
                    "task_id": self._attr(task, "id"),
                    "task_no": self._attr(task, "task_no"),
                    "name": self._attr(task, "name"),
                    "description": self._attr(task, "description"),
                    "category": self._attr(task, "category"),
                    "priority": self._attr(task, "priority"),
                    "quadrant": self._attr(task, "quadrant"),
                    "status": self._attr(task, "status"),
                }
                for task in self._tasks(analysis)
            ],
        }
        return json.dumps(payload, ensure_ascii=False, indent=2)

    @staticmethod
    def _attr(obj, name: str):
        if isinstance(obj, dict):
            return obj.get(name)
        return getattr(obj, name, None)

    def _tasks(self, analysis) -> list:
        return list(self._attr(analysis, "tasks") or [])

    @staticmethod
    def _escape_csv(value: object) -> str:
        text = "" if value is None else str(value)
        if any(char in text for char in [",", "\"", "\n"]):
            return '"' + text.replace('"', '""') + '"'
        return text
