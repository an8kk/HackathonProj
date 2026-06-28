from __future__ import annotations

from collections.abc import Callable

from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException, PermissionDeniedException
from litestar.handlers.base import BaseRouteHandler

from ..security import decode_access_token

Guard = Callable[[ASGIConnection, BaseRouteHandler], None]


def _authenticate(connection: ASGIConnection) -> str:
    header = connection.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        raise NotAuthorizedException(detail='missing_bearer_token')
    token = header[len('Bearer ') :].strip()
    settings = connection.app.state.settings
    try:
        payload = decode_access_token(secret=settings.jwt_secret, token=token)
    except Exception as error:  # noqa: BLE001 - any jwt failure is an auth failure
        raise NotAuthorizedException(detail='invalid_token') from error
    role = payload.get('role')
    connection.scope['user'] = {'id': payload.get('sub'), 'role': role}
    return role or ''


def require_auth(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    _authenticate(connection)


def require_roles(*roles: str) -> Guard:
    allowed = set(roles)

    def guard(connection: ASGIConnection, _: BaseRouteHandler) -> None:
        role = _authenticate(connection)
        if role not in allowed:
            raise PermissionDeniedException(detail='insufficient_role')

    return guard
