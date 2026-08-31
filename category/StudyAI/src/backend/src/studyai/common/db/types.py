from __future__ import annotations

from collections.abc import Callable
from math import isnan

from sqlalchemy.types import UserDefinedType

try:
    from pgvector.sqlalchemy import Vector as PgVector

    Vector = PgVector
except ImportError:

    class Vector(UserDefinedType):
        cache_ok = True

        def __init__(self, dimensions: int):
            self.dimensions = dimensions

        def get_col_spec(self, **kw):
            return f"VECTOR({self.dimensions})"

        def bind_processor(self, dialect) -> Callable[[list[float] | tuple[float, ...] | None], str | None]:
            def process(value):
                if value is None:
                    return None
                values = [0.0 if isnan(float(item)) else float(item) for item in value]
                return "[" + ",".join(f"{item:.12f}" for item in values) + "]"

            return process

        def result_processor(self, dialect, coltype) -> Callable[[str | list[float] | None], list[float] | None]:
            def process(value):
                if value is None or isinstance(value, list):
                    return value
                stripped = value.strip().strip("[]")
                if not stripped:
                    return []
                return [float(item) for item in stripped.split(",")]

            return process
