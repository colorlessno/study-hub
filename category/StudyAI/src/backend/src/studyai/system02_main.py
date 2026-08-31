from fastapi import FastAPI

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.systems.system02.api.router import router as system02_router


def create_system02_app() -> FastAPI:
    settings = get_settings()
    app = create_base_app()
    app.title = f"{settings.app_name} - System02"
    app.include_router(system02_router, prefix=settings.api_prefix, tags=["system02"])
    return app


app = create_system02_app()
