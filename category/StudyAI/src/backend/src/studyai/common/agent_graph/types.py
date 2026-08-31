from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class GraphNodeResult:
    updates: dict[str, Any] = field(default_factory=dict)
    next_step: str | None = None
    stop: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class GraphExecutionResult:
    state: dict[str, Any]
    status: str
    graph_name: str
