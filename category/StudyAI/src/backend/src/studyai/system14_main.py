from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system14.api.router import router as system14_router


def create_system14_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System14"
    app.include_router(system14_router, prefix=settings.api_prefix, tags=["system14"])
    return app


app = create_system14_app()
