from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from studyai.systems.enterprise_ai.catalog import SYSTEMS
from studyai.systems.enterprise_ai.service import EnterpriseAiUpstreamError, enterprise_ai_service


class ExecuteRequest(BaseModel):
    input: dict[str, Any] = Field(default_factory=dict)
    mode: str = "mock"
    operator: str = "learner"


def create_enterprise_ai_router(system_id: str) -> APIRouter:
    router = APIRouter(prefix=f"/{system_id}", tags=[system_id])

    @router.get("/metadata")
    async def metadata() -> dict[str, Any]:
        system = enterprise_ai_service.get_system(system_id)
        return {
            "system_id": system.system_id,
            "title": system.title,
            "pattern": system.pattern,
            "default_input": system.default_input,
            "state_flow": system.state_flow,
            "kpi_definitions": system.kpi_definitions,
            "risk_points": system.risk_points,
        }

    @router.post("/execute")
    async def execute(request: ExecuteRequest) -> dict[str, Any]:
        try:
            return enterprise_ai_service.execute(
                system_id,
                {"input": request.input, "mode": request.mode, "operator": request.operator},
            )
        except EnterpriseAiUpstreamError as exc:
            raise HTTPException(
                status_code=502,
                detail={"error_code": f"{system_id}_lmstudio_failed", "message": str(exc)},
            ) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"error_code": f"{system_id}_input_invalid", "message": str(exc)}) from exc

    @router.get("/runs")
    async def runs() -> dict[str, Any]:
        return {"runs": enterprise_ai_service.list_runs(system_id)}

    return router


def include_enterprise_ai_routers(api_router: APIRouter) -> None:
    for system_id in SYSTEMS:
        api_router.include_router(create_enterprise_ai_router(system_id))
