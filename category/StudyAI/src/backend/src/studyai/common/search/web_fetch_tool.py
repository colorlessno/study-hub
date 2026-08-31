from __future__ import annotations

from urllib.parse import urlparse

import httpx

from studyai.common.errors.models import ExternalServiceError


class WebFetchTool:
    async def fetch(self, url: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ExternalServiceError("research_fetch_failed", "Web page fetch failed.", 503) from exc

        content_type = response.headers.get("content-type", "").lower()
        if "html" not in content_type and "text" not in content_type:
            return {
                "url": str(response.url),
                "title": str(response.url),
                "content": "",
                "source_type": "web",
                "domain": urlparse(str(response.url)).netloc.lower(),
            }

        try:
            from bs4 import BeautifulSoup
        except ImportError as exc:
            raise ExternalServiceError("beautifulsoup_missing", "beautifulsoup4 is required for web fetch parsing.", 500) from exc

        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        title = soup.title.get_text(" ", strip=True) if soup.title else str(response.url)
        text = soup.get_text("\n", strip=True)
        return {
            "url": str(response.url),
            "title": title,
            "content": text[:8000],
            "source_type": "web",
            "domain": urlparse(str(response.url)).netloc.lower(),
        }
