from __future__ import annotations

from urllib.parse import quote_plus

import httpx

from studyai.common.errors.models import ExternalServiceError


class WebSearchTool:
    SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/"

    async def search(self, query: str, *, max_results: int = 5) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.get(f"{self.SEARCH_ENDPOINT}?q={quote_plus(query)}")
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ExternalServiceError("research_search_failed", "Web search failed.", 503) from exc

        html = response.text
        try:
            from bs4 import BeautifulSoup
        except ImportError as exc:
            raise ExternalServiceError("beautifulsoup_missing", "beautifulsoup4 is required for search parsing.", 500) from exc

        soup = BeautifulSoup(html, "html.parser")
        results: list[dict] = []
        for anchor in soup.select("a.result__a"):
            href = anchor.get("href")
            title = anchor.get_text(" ", strip=True)
            if not href or not title:
                continue
            snippet = ""
            container = anchor.find_parent(class_="result")
            if container is not None:
                snippet_node = container.select_one(".result__snippet")
                if snippet_node is not None:
                    snippet = snippet_node.get_text(" ", strip=True)
            results.append(
                {
                    "title": title,
                    "url": href,
                    "snippet": snippet,
                    "source_type": "search",
                }
            )
            if len(results) >= max_results:
                break
        return results
