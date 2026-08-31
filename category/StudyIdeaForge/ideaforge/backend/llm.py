import json

import httpx


def _headers(p):
    h = {"Content-Type": "application/json"}
    if p.get("api_key"):
        h["Authorization"] = "Bearer " + p["api_key"]
    return h


def _url(p):
    return p["base_url"].rstrip("/") + "/chat/completions"


async def stream_chat(p, messages, temperature=0.9):
    payload = {
        "model": p.get("model") or "",
        "messages": messages,
        "stream": True,
        "temperature": temperature,
    }
    try:
        timeout = httpx.Timeout(600.0, connect=20.0)
        async with httpx.AsyncClient(timeout=timeout) as cl:
            async with cl.stream("POST", _url(p), headers=_headers(p), json=payload) as r:
                if r.status_code != 200:
                    body = await r.aread()
                    yield "\n> ⚠ LLMエラー (%s): %s" % (
                        r.status_code,
                        body.decode("utf-8", "ignore")[:500],
                    )
                    return
                async for line in r.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        delta = json.loads(data)["choices"][0].get("delta", {}).get("content")
                        if delta:
                            yield delta
                    except Exception:
                        continue
    except Exception as e:
        yield "\n> ⚠ LLM接続エラー: %s" % e


async def complete(p, messages, temperature=0.7):
    payload = {
        "model": p.get("model") or "",
        "messages": messages,
        "stream": False,
        "temperature": temperature,
    }
    async with httpx.AsyncClient(timeout=120.0) as cl:
        r = await cl.post(_url(p), headers=_headers(p), json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
