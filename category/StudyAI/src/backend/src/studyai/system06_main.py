from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system06.api.router import router as system06_router


def create_system06_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System06"
    app.include_router(system06_router, prefix=settings.api_prefix, tags=["system06"])
    return app


app = create_system06_app()
