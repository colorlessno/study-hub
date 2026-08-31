from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system03.api.router import router as system03_router


def create_system03_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System03"
    app.include_router(system03_router, prefix=settings.api_prefix, tags=["system03"])
    return app


app = create_system03_app()
