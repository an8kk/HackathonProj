from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models
from ..domain.enums import MovementType
from ..schemas import InventoryCountRequest, SupplyRequest
from .errors import NotFoundError


async def add_movement(
    session: AsyncSession,
    *,
    outlet_id: str,
    product_id: str,
    movement_type: MovementType,
    quantity: float,
    source_request_id: str | None = None,
    external_source: str | None = None,
) -> models.InventoryMovement:
    movement = models.InventoryMovement(
        outlet_id=outlet_id,
        product_id=product_id,
        movement_type=movement_type,
        quantity=quantity,
        source_request_id=source_request_id,
        external_source=external_source,
        created_at=datetime.now(UTC),
    )
    session.add(movement)
    await session.flush()
    return movement


async def list_movements(session: AsyncSession) -> list[models.InventoryMovement]:
    result = await session.execute(
        select(models.InventoryMovement).order_by(models.InventoryMovement.created_at)
    )
    return list(result.scalars().all())


async def register_supply(session: AsyncSession, data: SupplyRequest) -> models.InventoryMovement:
    if await session.get(models.Outlet, data.outlet_id) is None:
        raise NotFoundError('outlet_not_found')
    if await session.get(models.Product, data.product_id) is None:
        raise NotFoundError('product_not_found')
    return await add_movement(
        session,
        outlet_id=data.outlet_id,
        product_id=data.product_id,
        movement_type=MovementType.SUPPLY,
        quantity=abs(data.quantity),
    )


async def balances(session: AsyncSession) -> list[dict]:
    movements = await list_movements(session)
    totals: dict[tuple[str, str], float] = defaultdict(float)
    for movement in movements:
        totals[(movement.outlet_id, movement.product_id)] += movement.quantity

    outlets = {o.id: o for o in (await session.execute(select(models.Outlet))).scalars()}
    products = {p.id: p for p in (await session.execute(select(models.Product))).scalars()}

    rows: list[dict] = []
    for (outlet_id, product_id), balance in totals.items():
        outlet = outlets.get(outlet_id)
        product = products.get(product_id)
        rows.append(
            {
                'outlet_id': outlet_id,
                'outlet_name': outlet.name if outlet else None,
                'product_id': product_id,
                'product_name': product.name if product else None,
                'balance': round(balance, 3),
            }
        )
    return rows


async def record_count(
    session: AsyncSession, data: InventoryCountRequest
) -> tuple[models.InventoryCount, list[models.InventoryMovement]]:
    if await session.get(models.Outlet, data.outlet_id) is None:
        raise NotFoundError('outlet_not_found')

    current = {
        (row['outlet_id'], row['product_id']): row['balance']
        for row in await balances(session)
    }

    count = models.InventoryCount(
        outlet_id=data.outlet_id,
        counted_by_id=data.counted_by_id,
        counted_at=datetime.now(UTC),
    )
    session.add(count)
    await session.flush()

    adjustments: list[models.InventoryMovement] = []
    for line in data.lines:
        session.add(
            models.InventoryCountLine(
                count_id=count.id,
                product_id=line.product_id,
                counted_quantity=line.counted_quantity,
            )
        )
        expected = current.get((data.outlet_id, line.product_id), 0.0)
        delta = line.counted_quantity - expected
        if abs(delta) > 1e-9:
            adjustments.append(
                await add_movement(
                    session,
                    outlet_id=data.outlet_id,
                    product_id=line.product_id,
                    movement_type=MovementType.COUNT_ADJUSTMENT,
                    quantity=delta,
                )
            )
    await session.flush()
    return count, adjustments


async def reconciliation(session: AsyncSession, *, outlet_id: str | None = None) -> list[dict]:
    movements = await list_movements(session)
    grouped: dict[tuple[str, str], dict[str, float]] = defaultdict(
        lambda: {key: 0.0 for key in MovementType}
    )
    for movement in movements:
        if outlet_id and movement.outlet_id != outlet_id:
            continue
        grouped[(movement.outlet_id, movement.product_id)][movement.movement_type] += movement.quantity

    products = {p.id: p for p in (await session.execute(select(models.Product))).scalars()}

    rows: list[dict] = []
    for (o_id, p_id), buckets in grouped.items():
        theoretical = (
            buckets[MovementType.OPENING_BALANCE]
            + buckets[MovementType.SUPPLY]
            + buckets[MovementType.SALE]
            + buckets[MovementType.TRANSFER]
        )
        actual = theoretical + buckets[MovementType.WRITE_OFF] + buckets[MovementType.COUNT_ADJUSTMENT]
        product = products.get(p_id)
        rows.append(
            {
                'outlet_id': o_id,
                'product_id': p_id,
                'product_name': product.name if product else None,
                'theoretical_balance': round(theoretical, 3),
                'actual_balance': round(actual, 3),
                'write_off_total': round(-buckets[MovementType.WRITE_OFF], 3),
                'unexplained_variance': round(buckets[MovementType.COUNT_ADJUSTMENT], 3),
            }
        )
    return rows
