from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class AuthenticatedUser:
    user_id: str | None = None
    roles: list[str] = field(default_factory=list)
    project_ids: list[str] = field(default_factory=list)

    @property
    def is_authenticated(self) -> bool:
        return bool(self.user_id)

    def has_any_role(self, required_roles: set[str]) -> bool:
        return bool(required_roles.intersection(self.roles))
