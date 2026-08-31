from studyai.systems.system02.services.issue_aggregator import IssueAggregator


def test_build_summary_marks_high_risk_when_critical_exists() -> None:
    issues = [
        {"type": "missing", "severity": "critical", "description": "知財が未定義"},
        {"type": "unfavorable", "severity": "medium", "description": "自動更新が広い"},
    ]
    summary = IssueAggregator().build_summary(issues)

    assert summary["overall_risk"] == "高リスク"
    assert summary["recommendation"] == "締結不推奨"
    assert summary["total_issues"] == 2


def test_merge_issues_deduplicates_same_issue() -> None:
    issue = {
        "type": "missing",
        "severity": "high",
        "article": "第1条",
        "description": "支払条件が未記載",
    }
    merged = IssueAggregator().merge_issues([issue, dict(issue)])
    assert len(merged) == 1


def test_build_summary_uses_required_low_risk_recommendation() -> None:
    summary = IssueAggregator().build_summary([])

    assert summary["overall_risk"] == "低リスク"
    assert summary["recommendation"] == "そのまま締結可"
