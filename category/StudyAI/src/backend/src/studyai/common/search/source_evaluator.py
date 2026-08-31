from __future__ import annotations

from urllib.parse import urldefrag, urlparse


class SourceEvaluator:
    LOW_TRUST_HINTS = ("blog", "note.com", "medium.com")

    def filter_sources(self, sources: list[dict], *, max_sources: int = 12) -> list[dict]:
        accepted: list[dict] = []
        seen_urls: set[str] = set()
        for source in sources:
            normalized_url = self._normalize_url(str(source.get("url") or ""))
            if not normalized_url or normalized_url in seen_urls:
                continue
            content = str(source.get("content") or source.get("snippet") or "").strip()
            if len(content) < 80:
                continue
            domain = str(source.get("domain") or urlparse(normalized_url).netloc.lower())
            trust = "low" if any(hint in domain for hint in self.LOW_TRUST_HINTS) else "standard"
            accepted.append(
                {
                    "title": str(source.get("title") or normalized_url),
                    "url": normalized_url,
                    "snippet": str(source.get("snippet") or "")[:500],
                    "content": content[:5000],
                    "source_type": str(source.get("source_type") or "web"),
                    "domain": domain,
                    "trust_level": trust,
                }
            )
            seen_urls.add(normalized_url)
            if len(accepted) >= max_sources:
                break
        return accepted

    @staticmethod
    def _normalize_url(url: str) -> str:
        if not url:
            return ""
        cleaned, _ = urldefrag(url.strip())
        parsed = urlparse(cleaned)
        if parsed.scheme not in {"http", "https"}:
            return ""
        return cleaned
