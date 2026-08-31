from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system10.api.router import router as system10_router


def create_system10_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System10"
    app.include_router(system10_router, prefix=settings.api_prefix, tags=["system10"])
    return app


app = create_system10_app()
