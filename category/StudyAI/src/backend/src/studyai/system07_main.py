from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system07.api.router import router as system07_router


def create_system07_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System07"
    app.include_router(system07_router, prefix=settings.api_prefix, tags=["system07"])
    return app


app = create_system07_app()
