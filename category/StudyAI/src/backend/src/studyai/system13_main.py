from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system13.api.router import router as system13_router


def create_system13_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System13"
    app.include_router(system13_router, prefix=settings.api_prefix, tags=["system13"])
    return app


app = create_system13_app()
