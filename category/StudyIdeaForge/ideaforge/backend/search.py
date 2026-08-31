import asyncio

import httpx

import db


async def web_search(query, max_results=8, engine=None):
    st = db.get_settings()
    eng = engine or st.get("search_engine", "ddg")
    if eng == "tavily":
        return await _tavily(query, max_results, st.get("tavily_api_key", ""))
    if eng == "brave":
        return await _brave(query, max_results, st.get("brave_api_key", ""))
    return await _ddg(query, max_results)


async def _ddg(q, n):
    def run():
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS
        with DDGS() as d:
            out = []
            for r in d.text(q, max_results=n):
                out.append(
                    {
                        "title": r.get("title", ""),
                        "url": r.get("href") or r.get("url", ""),
                        "snippet": r.get("body", ""),
                    }
                )
            return out

    return await asyncio.to_thread(run)


async def _tavily(q, n, key):
    if not key:
        raise RuntimeError("Tavily APIキーが未設定です(設定画面から登録してください)")
    async with httpx.AsyncClient(timeout=30) as cl:
        r = await cl.post(
            "https://api.tavily.com/search",
            json={"api_key": key, "query": q, "max_results": n},
        )
        r.raise_for_status()
        return [
            {
                "title": x.get("title", ""),
                "url": x.get("url", ""),
                "snippet": (x.get("content") or "")[:400],
            }
            for x in r.json().get("results", [])
        ]


async def _brave(q, n, key):
    if not key:
        raise RuntimeError("Brave APIキーが未設定です(設定画面から登録してください)")
    async with httpx.AsyncClient(timeout=30) as cl:
        r = await cl.get(
            "https://api.search.brave.com/res/v1/web/search",
            params={"q": q, "count": n},
            headers={"X-Subscription-Token": key, "Accept": "application/json"},
        )
        r.raise_for_status()
        results = r.json().get("web", {}).get("results", [])[:n]
        return [
            {
                "title": x.get("title", ""),
                "url": x.get("url", ""),
                "snippet": x.get("description", ""),
            }
            for x in results
        ]
