from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models
from ..security import create_access_token, verify_pin
from ..settings import Settings
from .errors import UnauthorizedError


async def login_with_pin(
    session: AsyncSession, *, pin: str, settings: Settings
) -> tuple[models.Employee, str]:
    result = await session.execute(select(models.Employee).where(models.Employee.active.is_(True)))
    employees = result.scalars().all()
    for employee in employees:
        if verify_pin(pin, employee.pin_hash):
            token = create_access_token(
                secret=settings.jwt_secret,
                subject=employee.id,
                role=employee.role,
                ttl_seconds=settings.jwt_ttl_seconds,
            )
            return employee, token
    raise UnauthorizedError('invalid_pin')
