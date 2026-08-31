from __future__ import annotations

from dataclasses import dataclass

from studyai.common.agent_graph.errors import GraphRetryableError


@dataclass(frozen=True, slots=True)
class LoopPolicy:
    max_iterations: int
    stop_if_no_progress: bool = True

    def should_continue(self, *, iteration: int, made_progress: bool = True) -> bool:
        if iteration >= self.max_iterations:
            return False
        if self.stop_if_no_progress and not made_progress:
            return False
        return True


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    max_attempts: int = 1

    def should_retry(self, *, attempt: int, error: Exception) -> bool:
        if self.max_attempts <= 1:
            return False
        if attempt >= self.max_attempts:
            return False
        return isinstance(error, GraphRetryableError)
