from __future__ import annotations

import logging
from time import perf_counter

from fastapi import Request, Response


def log_request_start(request: Request, trace_id: str) -> float:
    logging.getLogger("studyai.http").info(
        "request_started method=%s path=%s trace_id=%s client=%s",
        request.method,
        request.url.path,
        trace_id,
        request.client.host if request.client else "-",
    )
    return perf_counter()


def log_request_end(request: Request, response: Response, trace_id: str, started_at: float) -> None:
    duration_ms = int((perf_counter() - started_at) * 1000)
    logging.getLogger("studyai.http").info(
        "request_completed method=%s path=%s status=%s duration_ms=%s trace_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        trace_id,
    )
