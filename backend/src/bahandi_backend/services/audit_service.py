from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models


async def record_event(
    session: AsyncSession,
    *,
    actor_id: str | None,
    entity_type: str,
    entity_id: str,
    action: str,
    payload: dict[str, Any] | None = None,
) -> models.AuditEvent:
    event = models.AuditEvent(
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        payload=payload or {},
        created_at=datetime.now(UTC),
    )
    session.add(event)
    return event


async def list_events(session: AsyncSession, *, limit: int = 200) -> list[models.AuditEvent]:
    result = await session.execute(
        select(models.AuditEvent).order_by(models.AuditEvent.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())
