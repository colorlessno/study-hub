from fastapi import APIRouter

from studyai.api.system_clock_router import router as system_clock_router
from studyai.systems.ai_learning.router import include_ai_learning_routers
from studyai.systems.enterprise_ai.router import include_enterprise_ai_routers
from studyai.systems.system01.api.router import router as system01_router

api_router = APIRouter()
api_router.include_router(system01_router, tags=["system01"])
api_router.include_router(system_clock_router)
include_ai_learning_routers(api_router)
include_enterprise_ai_routers(api_router)
