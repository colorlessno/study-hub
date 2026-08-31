from __future__ import annotations

from studyai.systems.system12.services.conversation_agent import ConversationAgent


def test_conversation_agent_fallback_extracts_core_conditions() -> None:
    agent = ConversationAgent()

    conditions = agent._fallback_extract(
        "母の日に母へ、予算は5千円くらいで花は避けたいです。",
        {},
    )

    assert conditions["scene"] == "母の日"
    assert conditions["recipient"] == "母"
    assert conditions["budget"] == 5000
    assert "ng_items" in conditions


def test_conversation_agent_builds_followup_question() -> None:
    question = ConversationAgent().build_followup_question(["budget"])
    assert "予算" in question
