from __future__ import annotations

from collections import Counter


class IssueAggregator:
    RECOMMENDATION_NOTE = "AIによる一次審査の参考情報です。最終判断は法務・専門家確認を前提としてください。"

    def merge_issues(self, issues: list[dict]) -> list[dict]:
        merged = []
        seen = set()
        for issue in issues:
            key = (issue["type"], issue["severity"], issue.get("article"), issue["description"])
            if key in seen:
                continue
            seen.add(key)
            merged.append(issue)
        return merged

    def build_summary(self, issues: list[dict]) -> dict:
        by_type = Counter(issue["type"] for issue in issues)
        by_severity = Counter(issue["severity"] for issue in issues)
        overall_risk = self._overall_risk(by_severity)
        recommendation = self._recommendation(overall_risk)
        top_priorities = [
            f"{issue['description']}（{issue['type']}・{issue['severity']}）"
            for issue in sorted(issues, key=self._priority_key)[:3]
        ]
        return {
            "total_issues": len(issues),
            "by_type": dict(by_type),
            "by_severity": dict(by_severity),
            "overall_risk": overall_risk,
            "recommendation": recommendation,
            "recommendation_note": self.RECOMMENDATION_NOTE,
            "top_priorities": top_priorities,
        }

    @staticmethod
    def _priority_key(issue: dict) -> tuple[int, str]:
        order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        return (order.get(issue["severity"], 9), issue["description"])

    @staticmethod
    def _overall_risk(by_severity: Counter) -> str:
        if by_severity.get("critical", 0) > 0 or by_severity.get("high", 0) >= 2:
            return "高リスク"
        if by_severity.get("high", 0) > 0 or by_severity.get("medium", 0) >= 2:
            return "中リスク"
        return "低リスク"

    @staticmethod
    def _recommendation(overall_risk: str) -> str:
        return {
            "高リスク": "締結不推奨",
            "中リスク": "要修正後締結",
            "低リスク": "そのまま締結可",
        }[overall_risk]
