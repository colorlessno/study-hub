from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system16.api.router import router as system16_router


def create_system16_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System16"
    app.include_router(system16_router, prefix=settings.api_prefix, tags=["system16"])
    return app


app = create_system16_app()
