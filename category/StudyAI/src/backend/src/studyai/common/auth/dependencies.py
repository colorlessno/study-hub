from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Request

from studyai.common.auth.models import AuthenticatedUser
from studyai.common.errors.models import AppError

USER_ID_HEADER = "X-User-Id"
USER_ROLES_HEADER = "X-User-Roles"
PROJECT_IDS_HEADER = "X-Project-Ids"


def parse_user_from_headers(headers, *, enabled: bool = False) -> AuthenticatedUser:
    if not enabled:
        return AuthenticatedUser(user_id=None, roles=[], project_ids=[])
    user_id = headers.get(USER_ID_HEADER)
    roles = _split_header_values(headers.get(USER_ROLES_HEADER))
    project_ids = _split_header_values(headers.get(PROJECT_IDS_HEADER))
    return AuthenticatedUser(user_id=user_id, roles=roles, project_ids=project_ids)


async def get_current_user(request: Request) -> AuthenticatedUser:
    cached = getattr(request.state, "current_user", None)
    if cached is not None:
        return cached
    user = parse_user_from_headers(request.headers, enabled=False)
    request.state.current_user = user
    return user


async def require_authenticated(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not current_user.is_authenticated:
        raise AppError("authentication_required", "認証が必要です。", 401)
    return current_user


def require_roles(*roles: str) -> Callable[..., AuthenticatedUser]:
    required_roles = {role for role in roles if role}

    async def dependency(
        current_user: AuthenticatedUser = Depends(require_authenticated),
    ) -> AuthenticatedUser:
        if required_roles and not current_user.has_any_role(required_roles):
            raise AppError(
                "forbidden_operation",
                "必要な権限がありません。",
                403,
                {"required_roles": sorted(required_roles)},
            )
        return current_user

    return dependency


def _split_header_values(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]
