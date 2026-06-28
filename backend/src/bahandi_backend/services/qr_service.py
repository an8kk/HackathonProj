from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models
from ..domain.enums import QrEntityType
from ..schemas import CreateQrTokenRequest
from ..settings import Settings
from .errors import NotFoundError, ServiceError

_ENTITY_MODELS = {
    QrEntityType.OUTLET: models.Outlet,
    QrEntityType.PRODUCT: models.Product,
    QrEntityType.WRITE_OFF_REQUEST: models.WriteOffRequest,
}


async def create_token(
    session: AsyncSession, data: CreateQrTokenRequest, *, settings: Settings
) -> tuple[models.QrToken, str]:
    try:
        entity_type = QrEntityType(data.entity_type)
    except ValueError as error:
        raise ServiceError('invalid_entity_type') from error

    model = _ENTITY_MODELS.get(entity_type)
    if model is not None and await session.get(model, data.entity_id) is None:
        raise NotFoundError('entity_not_found')

    token_value = secrets.token_urlsafe(16)
    expires_at = (
        datetime.now(UTC) + timedelta(seconds=data.ttl_seconds) if data.ttl_seconds else None
    )
    token = models.QrToken(
        token=token_value,
        entity_type=entity_type,
        entity_id=data.entity_id,
        created_at=datetime.now(UTC),
        expires_at=expires_at,
    )
    session.add(token)
    await session.flush()
    return token, f'{settings.qr_base_url}/{token_value}'


async def resolve_token(session: AsyncSession, token_value: str) -> dict:
    result = await session.execute(select(models.QrToken).where(models.QrToken.token == token_value))
    token = result.scalars().first()
    if token is None:
        raise NotFoundError('qr_token_not_found')
    if token.expires_at is not None:
        expires_at = token.expires_at if token.expires_at.tzinfo else token.expires_at.replace(tzinfo=UTC)
        if expires_at < datetime.now(UTC):
            raise ServiceError('qr_token_expired')
    return {'entity_type': token.entity_type, 'entity_id': token.entity_id}
