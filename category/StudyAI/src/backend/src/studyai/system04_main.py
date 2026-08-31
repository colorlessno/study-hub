from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system04.api.router import router as system04_router


def create_system04_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System04"
    app.include_router(system04_router, prefix=settings.api_prefix, tags=["system04"])
    return app


app = create_system04_app()
