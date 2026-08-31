from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx

from studyai.common.errors.models import ExternalServiceError


class WebFetchTool:
    MAX_REDIRECTS = 5

    async def fetch(self, url: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
                current_url = url
                for _ in range(self.MAX_REDIRECTS + 1):
                    await _assert_public_http_url(current_url)
                    response = await client.get(current_url)
                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            response.raise_for_status()
                        current_url = urljoin(str(response.url), location)
                        continue
                    response.raise_for_status()
                    break
                else:
                    raise ExternalServiceError(
                        "research_fetch_redirect_limit",
                        "Web page redirect limit exceeded.",
                        502,
                    )
        except ExternalServiceError:
            raise
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


async def _assert_public_http_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ExternalServiceError("unsafe_fetch_url", "Only public HTTP(S) URLs can be fetched.", 400)
    if parsed.username or parsed.password:
        raise ExternalServiceError("unsafe_fetch_url", "Authenticated URLs cannot be fetched.", 400)

    hostname = parsed.hostname.rstrip(".").lower()
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ExternalServiceError("unsafe_fetch_url", "Local addresses cannot be fetched.", 400)

    try:
        literal = ipaddress.ip_address(hostname.split("%", 1)[0])
        addresses = [literal]
    except ValueError:
        try:
            records = await asyncio.get_running_loop().getaddrinfo(
                hostname,
                parsed.port or (443 if parsed.scheme == "https" else 80),
                type=socket.SOCK_STREAM,
            )
        except OSError as exc:
            raise ExternalServiceError("research_fetch_dns_failed", "Web page host could not be resolved.", 503) from exc
        addresses = [ipaddress.ip_address(record[4][0].split("%", 1)[0]) for record in records]

    if not addresses or any(not address.is_global for address in addresses):
        raise ExternalServiceError("unsafe_fetch_url", "Private or reserved addresses cannot be fetched.", 400)
