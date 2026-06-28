from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain.enums import ProductUnit, Role
from ..security import hash_pin
from . import models

_OUTLETS = [
    ('outlet-mega', 'Mega Silk Way', 'Астана, пр. Кабанбай Батыра 62', '550'),
    ('outlet-dostyk', 'Dostyk Plaza', 'Алматы, Самал-2 111', None),
]

_EMPLOYEES = [
    ('employee-sender-1', 'outlet-mega', 'Алия Сейткали', Role.SENDER, '1111'),
    ('employee-reviewer-1', 'outlet-mega', 'Марат Исаев', Role.REVIEWER, '2222'),
    ('employee-owner-1', 'outlet-mega', 'Динара Касым', Role.OWNER, '9999'),
    ('employee-sender-2', 'outlet-dostyk', 'Айгуль Нурова', Role.SENDER, '3333'),
]

_PRODUCTS = [
    ('product-beef-patty', 'Говяжья котлета', ProductUnit.PIECES, 420.0, 3.5),
    ('product-bun', 'Булочка бургерная', ProductUnit.PIECES, 90.0, 2.0),
    ('product-fries', 'Картофель фри', ProductUnit.GRAMS, 1.8, 5.0),
    ('product-lettuce', 'Листья салата', ProductUnit.GRAMS, 2.4, 8.0),
]


async def seed_demo_data(session: AsyncSession) -> None:
    existing = await session.scalar(select(func.count()).select_from(models.Outlet))
    if existing:
        return

    now = datetime.now(UTC)
    for outlet_id, name, address, iiko_store_id in _OUTLETS:
        session.add(
            models.Outlet(
                id=outlet_id, name=name, address=address, iiko_store_id=iiko_store_id, created_at=now
            )
        )
    for product_id, name, unit, cost, norm in _PRODUCTS:
        session.add(
            models.Product(
                id=product_id, name=name, unit=unit, cost_per_unit=cost, created_at=now
            )
        )
    # Flush parents (outlets, products) before inserting rows that reference them
    # so enforced foreign keys (Postgres) are satisfied.
    await session.flush()

    for emp_id, outlet_id, name, role, pin in _EMPLOYEES:
        session.add(
            models.Employee(
                id=emp_id,
                outlet_id=outlet_id,
                name=name,
                role=role,
                pin_hash=hash_pin(pin),
                created_at=now,
            )
        )
    for product_id, name, unit, cost, norm in _PRODUCTS:
        session.add(
            models.WasteNorm(
                product_id=product_id, outlet_id=None, max_waste_pct=norm, effective_from=now
            )
        )
    await session.flush()

    for outlet_id, *_ in _OUTLETS:
        for product_id, *_rest in _PRODUCTS:
            session.add(
                models.InventoryMovement(
                    outlet_id=outlet_id,
                    product_id=product_id,
                    movement_type='OPENING_BALANCE',
                    quantity=1000.0,
                    created_at=now,
                )
            )
    await session.flush()
