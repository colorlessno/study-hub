from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system09.api.router import router as system09_router


def create_system09_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System09"
    app.include_router(system09_router, prefix=settings.api_prefix, tags=["system09"])
    return app


app = create_system09_app()
