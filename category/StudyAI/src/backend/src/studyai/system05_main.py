from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system05.api.router import router as system05_router


def create_system05_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System05"
    app.include_router(system05_router, prefix=settings.api_prefix, tags=["system05"])
    return app


app = create_system05_app()
