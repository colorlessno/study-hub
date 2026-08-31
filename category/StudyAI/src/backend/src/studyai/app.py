from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from studyai.api.router import api_router
from studyai.common.auth.dependencies import parse_user_from_headers
from studyai.common.config.settings import get_settings
from studyai.common.errors.models import AppError
from studyai.common.logging.request_logger import log_request_end, log_request_start
from studyai.common.logging.setup import configure_logging


def create_base_app() -> FastAPI:
    settings = get_settings()
    configure_logging()

    app = FastAPI(title=settings.app_name)

    @app.middleware("http")
    async def add_trace_id(request: Request, call_next):
        request.state.trace_id = str(uuid.uuid4())
        request.state.current_user = parse_user_from_headers(
            request.headers,
            enabled=settings.allow_demo_header_auth,
        )
        started_at = log_request_start(request, request.state.trace_id)
        try:
            response = await call_next(request)
        except Exception:
            logging.getLogger("studyai.http").exception(
                "request_failed method=%s path=%s trace_id=%s",
                request.method,
                request.url.path,
                request.state.trace_id,
            )
            raise
        response.headers["X-Trace-Id"] = request.state.trace_id
        log_request_end(request, response, request.state.trace_id, started_at)
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "trace_id": getattr(request.state, "trace_id", ""),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logging.getLogger(__name__).exception("Unhandled error")
        return JSONResponse(
            status_code=500,
            content={
                "error_code": "internal_server_error",
                "message": "内部エラーが発生しました。",
                "details": {},
                "trace_id": getattr(request.state, "trace_id", ""),
            },
        )

    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "ok"}

    return app


def create_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.include_router(api_router, prefix=settings.api_prefix)
    return app
