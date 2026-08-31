from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from studyai.systems.ai_learning.catalog import SYSTEMS
from studyai.systems.ai_learning.service import learning_service


class ExecuteRequest(BaseModel):
    input: dict[str, Any] = Field(default_factory=dict)


def create_ai_learning_router(system_id: str) -> APIRouter:
    router = APIRouter(prefix=f"/{system_id}", tags=[system_id])

    @router.get("/metadata")
    async def metadata() -> dict[str, Any]:
        system = learning_service.get_system(system_id)
        return {
            "system_id": system.system_id,
            "title": system.title,
            "category": system.category,
            "default_input": system.default_input,
            "observation_hint": system.observation_hint,
            "samples": list(system.samples),
        }

    @router.post("/execute")
    async def execute(request: ExecuteRequest) -> dict[str, Any]:
        try:
            return await learning_service.execute_async(system_id, request.input)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"error_code": f"{system_id}_input_invalid", "message": str(exc)}) from exc

    @router.get("/runs")
    async def runs() -> dict[str, Any]:
        return {"runs": learning_service.list_runs(system_id)}

    return router


def include_ai_learning_routers(api_router: APIRouter) -> None:
    for system_id in SYSTEMS:
        api_router.include_router(create_ai_learning_router(system_id))
