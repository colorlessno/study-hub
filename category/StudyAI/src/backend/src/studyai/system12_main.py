from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system12.api.router import router as system12_router


def create_system12_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System12"
    app.include_router(system12_router, prefix=settings.api_prefix, tags=["system12"])
    return app


app = create_system12_app()
