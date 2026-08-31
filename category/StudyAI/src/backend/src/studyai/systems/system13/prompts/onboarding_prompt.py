from __future__ import annotations

import json


def build_ask_prompts(
    *,
    question: str,
    project_id: str,
    role: str,
    days_since_joined: int,
    history: list[dict],
    sources: list[dict],
) -> tuple[str, str]:
    schema = {
        "answer": "string",
        "confidence": "high|medium|low",
        "sources": [
            {
                "title": "string",
                "category": "string",
                "excerpt": "string",
            }
        ],
        "warning": "string|null",
        "related_info": ["string"],
        "escalation": {
            "target": "string",
            "reason": "string",
        },
    }
    system_prompt = (
        "You are an onboarding assistant for a software project. "
        "Answer only from the provided project knowledge. "
        "If the evidence is weak or missing, say so and add a warning. "
        "If the topic should be escalated to a person or team, return escalation info. "
        f"Return JSON only. Schema: {json.dumps(schema, ensure_ascii=False)}"
    )
    user_prompt = (
        f"project_id: {project_id}\n"
        f"role: {role}\n"
        f"days_since_joined: {days_since_joined}\n"
        f"question: {question}\n"
        f"history: {json.dumps(history, ensure_ascii=False)}\n"
        f"sources: {json.dumps(sources, ensure_ascii=False)}"
    )
    return system_prompt, user_prompt


def build_catchup_report_prompts(
    *,
    project: dict,
    role: str,
    days_since_joined: int,
    high_priority_knowledge: list[dict],
    landmines: list[dict],
    key_persons: list[dict],
    checklist_items: list[dict],
) -> tuple[str, str]:
    schema = {
        "overview": "string",
        "critical_issues": ["string"],
        "landmines": ["string"],
        "key_persons": [
            {"name": "string", "role": "string", "contact": "string|null"},
        ],
        "important_docs": [
            {"title": "string", "category": "string"},
        ],
        "first_week_tasks": ["string"],
    }
    system_prompt = (
        "You generate a catch-up report for a new project member. "
        "Use only the provided project context. "
        "Keep the output concrete and operational. "
        f"Return JSON only. Schema: {json.dumps(schema, ensure_ascii=False)}"
    )
    user_prompt = (
        f"project: {json.dumps(project, ensure_ascii=False)}\n"
        f"role: {role}\n"
        f"days_since_joined: {days_since_joined}\n"
        f"high_priority_knowledge: {json.dumps(high_priority_knowledge, ensure_ascii=False)}\n"
        f"landmines: {json.dumps(landmines, ensure_ascii=False)}\n"
        f"key_persons: {json.dumps(key_persons, ensure_ascii=False)}\n"
        f"checklist_items: {json.dumps(checklist_items, ensure_ascii=False)}"
    )
    return system_prompt, user_prompt
