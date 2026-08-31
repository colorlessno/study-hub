from __future__ import annotations


class PriorityScorer:
    def score_tasks(self, tasks: list[dict]) -> tuple[list[dict], dict]:
        scored_tasks: list[dict] = []
        quadrants: dict[str, list[int]] = {
            "quadrant_1": [],
            "quadrant_2": [],
            "quadrant_3": [],
            "quadrant_4": [],
        }
        ordering: list[tuple[tuple[int, float, int], int]] = []

        for index, task in enumerate(tasks, start=1):
            urgency = self._normalize_level(task.get("urgency"))
            importance = self._normalize_level(task.get("importance"))
            priority, quadrant, order_key = self._score_level(urgency, importance)

            scored = dict(task)
            scored["task_no"] = int(task.get("task_no") or index)
            scored["urgency"] = urgency
            scored["importance"] = importance
            scored["priority"] = priority
            scored["quadrant"] = quadrant
            scored["status"] = str(task.get("status") or "todo")
            if task.get("estimated_hours") is not None:
                scored["estimated_hours"] = round(float(task["estimated_hours"]), 1)
            scored_tasks.append(scored)

            quadrant_key = {
                "第1象限": "quadrant_1",
                "第2象限": "quadrant_2",
                "第3象限": "quadrant_3",
                "第4象限": "quadrant_4",
            }[quadrant]
            quadrants[quadrant_key].append(scored["task_no"])
            ordering.append((order_key, scored["task_no"]))

        ordering.sort()
        recommended_order = [task_no for _, task_no in ordering]
        first_week_tasks = recommended_order[: min(3, len(recommended_order))]
        priority_summary = {
            **quadrants,
            "recommended_order": recommended_order,
            "first_week_tasks": first_week_tasks,
        }
        return scored_tasks, priority_summary

    @staticmethod
    def _normalize_level(value: object) -> str:
        text = str(value or "").strip().casefold()
        mapping = {
            "high": "high",
            "高": "high",
            "高い": "high",
            "medium": "medium",
            "中": "medium",
            "普通": "medium",
            "low": "low",
            "低": "low",
            "低い": "low",
        }
        return mapping.get(text, "medium")

    @staticmethod
    def _score_level(urgency: str, importance: str) -> tuple[str, str, tuple[int, float, int]]:
        if urgency == "high" and importance == "high":
            return "high", "第1象限", (1, 0.0, 0)
        if urgency == "low" and importance == "high":
            return "high", "第2象限", (2, 0.0, 0)
        if urgency == "high" and importance == "low":
            return "medium", "第3象限", (3, 0.0, 0)
        if urgency == "medium" and importance == "high":
            return "high", "第2象限", (2, 0.5, 0)
        if urgency == "high" and importance == "medium":
            return "medium", "第1象限", (1, 0.5, 0)
        if urgency == "medium" and importance == "medium":
            return "medium", "第2象限", (2, 1.0, 0)
        if urgency == "low" and importance == "medium":
            return "low", "第4象限", (4, 0.0, 0)
        if urgency == "medium" and importance == "low":
            return "low", "第3象限", (3, 1.0, 0)
        return "low", "第4象限", (4, 1.0, 0)
