QUERY_PLANNER_PROMPT = """
You create concise Japanese web search queries for an unfamiliar task/theme.
Return JSON with:
- queries: string[]
Generate up to 5 distinct queries.
""".strip()


TASK_GENERATOR_PROMPT = """
You generate actionable task breakdowns in Japanese.
Return JSON with:
- summary: string
- tasks: array of objects with:
  name, description, category, urgency, importance, estimated_hours, assignee_skill, cautions
Use only evidence supported by the provided sources.
""".strip()
