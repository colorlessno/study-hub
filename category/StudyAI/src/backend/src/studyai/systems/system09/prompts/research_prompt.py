from __future__ import annotations

import json

from studyai.systems.system09.schemas.research import ResearchRequest


def build_plan_prompt(request: ResearchRequest) -> tuple[str, str]:
    schema = {
        "plan": [
            {
                "topic": "string",
                "priority": 1,
                "search_hints": ["string"],
            }
        ]
    }
    system_prompt = (
        "You are a market research planner. "
        "Create a concise research plan from the request. "
        f"Return JSON only. Schema: {json.dumps(schema, ensure_ascii=False)}"
    )
    user_prompt = json.dumps(request.model_dump(mode="json"), ensure_ascii=False)
    return system_prompt, user_prompt


def build_query_prompt(request: ResearchRequest, plan: list[dict]) -> tuple[str, str]:
    schema = {"queries": ["string"]}
    system_prompt = (
        "You generate web search queries for market and competitor research. "
        "Use short, concrete queries. Return JSON only. "
        f"Schema: {json.dumps(schema, ensure_ascii=False)}"
    )
    user_prompt = json.dumps(
        {"request": request.model_dump(mode="json"), "plan": plan},
        ensure_ascii=False,
    )
    return system_prompt, user_prompt


def build_report_prompt(request: ResearchRequest, sources: list[dict]) -> tuple[str, str]:
    schema = {
        "executive_summary": "string",
        "key_findings": ["string"],
        "companies": [
            {
                "name": "string",
                "overview": "string",
                "products": ["string"],
                "strengths": ["string"],
                "weaknesses": ["string"],
                "recent_news": ["string"],
                "sources": ["string"],
            }
        ],
        "comparison_table": {"headers": ["string"], "rows": [["string"]]},
        "swot": {
            "strengths": ["string"],
            "weaknesses": ["string"],
            "opportunities": ["string"],
            "threats": ["string"],
        },
        "trends": "string",
        "limitations": "string",
    }
    system_prompt = (
        "You are a market research analyst. "
        "Use only the provided web sources. "
        "State uncertainty explicitly in limitations. "
        f"Return JSON only. Schema: {json.dumps(schema, ensure_ascii=False)}"
    )
    user_prompt = json.dumps(
        {"request": request.model_dump(mode="json"), "sources": sources},
        ensure_ascii=False,
    )
    return system_prompt, user_prompt
