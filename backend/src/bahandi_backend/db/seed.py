from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain.enums import (
    DeductionType,
    MovementType,
    ProductUnit,
    ReasonCode,
    Role,
    WriteOffStatus,
)
from ..security import hash_pin
from . import models

# --- reference data (always seeded; tests rely on this) ----------------------

_OUTLETS = [
    ('outlet-mega', 'Mega Silk Way', 'Астана, пр. Кабанбай Батыра 62', '550'),
    ('outlet-khanshatyr', 'Khan Shatyr', 'Астана, пр. Туран 37', '551'),
    ('outlet-dostyk', 'Dostyk Plaza', 'Алматы, пр. Достык 111', '552'),
    ('outlet-mart', 'MART Village', 'Шымкент, ул. Тауке хана 1', '553'),
    ('outlet-aport', 'Aport Mall', 'Алматы, Бесагаш 2', '554'),
]

# (id, outlet_id, name, role, pin). PINs 1111/2222/9999/3333 are stable for demos/tests.
_EMPLOYEES = [
    ('employee-sender-1', 'outlet-mega', 'Айгерим Сейткали', Role.SENDER, '1111'),
    ('employee-reviewer-1', 'outlet-mega', 'Марат Исаев', Role.REVIEWER, '2222'),
    ('employee-owner-1', 'outlet-mega', 'Динара Касым', Role.OWNER, '9999'),
    ('employee-sender-2', 'outlet-dostyk', 'Айгуль Нурова', Role.SENDER, '3333'),
    ('employee-sender-3', 'outlet-mega', 'Дамир Алиев', Role.SENDER, '1112'),
    ('employee-sender-4', 'outlet-khanshatyr', 'Мадина Коныс', Role.SENDER, '1113'),
    ('employee-sender-5', 'outlet-khanshatyr', 'Нурлан Жакып', Role.SENDER, '1114'),
    ('employee-sender-6', 'outlet-dostyk', 'Самат Ермек', Role.SENDER, '1115'),
    ('employee-sender-7', 'outlet-mart', 'Алия Тлеу', Role.SENDER, '1116'),
    ('employee-sender-8', 'outlet-aport', 'Бекзат Сапар', Role.SENDER, '1117'),
    ('employee-reviewer-2', 'outlet-dostyk', 'Жанна Ким', Role.REVIEWER, '2223'),
]

# (id, name, unit, cost_per_unit, norm_waste_pct)
_PRODUCTS = [
    ('product-beef-patty', 'Говяжья котлета', ProductUnit.PIECES, 420.0, 3.5),
    ('product-chicken-patty', 'Куриная котлета', ProductUnit.PIECES, 320.0, 3.0),
    ('product-bun', 'Булочка бургерная', ProductUnit.PIECES, 90.0, 2.0),
    ('product-fries', 'Картофель фри', ProductUnit.GRAMS, 1.8, 5.0),
    ('product-lettuce', 'Листья салата', ProductUnit.GRAMS, 2.4, 8.0),
    ('product-tomato', 'Помидор', ProductUnit.GRAMS, 1.6, 7.0),
    ('product-cheese', 'Сыр чеддер', ProductUnit.GRAMS, 4.2, 2.5),
    ('product-sauce', 'Фирменный соус', ProductUnit.GRAMS, 3.0, 4.0),
]

_REASONS = [
    ReasonCode.DAMAGED,
    ReasonCode.EXPIRED,
    ReasonCode.OVERCOOKED,
    ReasonCode.RAW_WASTE,
    ReasonCode.DROPPED,
    ReasonCode.OTHER,
]


async def seed_reference_data(session: AsyncSession) -> None:
    """Outlets, employees, products, norms, opening balances. Idempotent."""
    if await session.scalar(select(func.count()).select_from(models.Outlet)):
        return

    now = datetime.now(UTC)
    for outlet_id, name, address, store in _OUTLETS:
        session.add(
            models.Outlet(id=outlet_id, name=name, address=address, iiko_store_id=store, created_at=now)
        )
    for product_id, name, unit, cost, _norm in _PRODUCTS:
        session.add(
            models.Product(id=product_id, name=name, unit=unit, cost_per_unit=cost, created_at=now)
        )
    await session.flush()

    for emp_id, outlet_id, name, role, pin in _EMPLOYEES:
        session.add(
            models.Employee(
                id=emp_id, outlet_id=outlet_id, name=name, role=role, pin_hash=hash_pin(pin), created_at=now
            )
        )
    for product_id, _n, _u, _c, norm in _PRODUCTS:
        session.add(
            models.WasteNorm(product_id=product_id, outlet_id=None, max_waste_pct=norm, effective_from=now)
        )
    for outlet_id, *_ in _OUTLETS:
        for product_id, *_rest in _PRODUCTS:
            session.add(
                models.InventoryMovement(
                    outlet_id=outlet_id,
                    product_id=product_id,
                    movement_type=MovementType.OPENING_BALANCE,
                    quantity=1000.0,
                    created_at=now,
                )
            )
    await session.flush()


async def seed_demo_history(session: AsyncSession) -> None:
    """Generate a realistic 30-day write-off history so analytics/KPI are non-empty.

    Gated by SEED_DEMO_DATA so the test suite stays isolated. Idempotent.
    """
    if await session.scalar(select(func.count()).select_from(models.WriteOffRequest)):
        return

    rng = random.Random(42)
    now = datetime.now(UTC)

    senders_by_outlet: dict[str, list[str]] = {}
    reviewer_by_outlet: dict[str, str] = {}
    for emp_id, outlet_id, _name, role, _pin in _EMPLOYEES:
        if role == Role.SENDER:
            senders_by_outlet.setdefault(outlet_id, []).append(emp_id)
        elif role == Role.REVIEWER:
            reviewer_by_outlet[outlet_id] = emp_id
    product_ids = [p[0] for p in _PRODUCTS]
    outlet_ids = [o[0] for o in _OUTLETS]
    # Mega Silk Way is the "red zone" — more frequent, more suspicious clusters.
    weights = {oid: (3.0 if oid == 'outlet-mega' else 1.0) for oid in outlet_ids}

    movements: list[models.InventoryMovement] = []

    for day in range(30):
        day_start = now - timedelta(days=day)
        for outlet_id in outlet_ids:
            senders = senders_by_outlet.get(outlet_id)
            if not senders:
                continue
            count = rng.randint(1, int(2 + 3 * weights[outlet_id]))
            for _ in range(count):
                sender = rng.choice(senders)
                product_id = rng.choice(product_ids)
                reason = rng.choice(_REASONS)
                hour = rng.randint(9, 21)
                # suspicious cluster: one Mega sender dumps raw waste near closing
                if outlet_id == 'outlet-mega' and sender == 'employee-sender-3' and rng.random() < 0.5:
                    reason = ReasonCode.RAW_WASTE
                    hour = rng.choice([22, 23])
                created_at = day_start.replace(hour=hour, minute=rng.randint(0, 59), second=0, microsecond=0)
                quantity = round(rng.uniform(1, 12), 1)
                roll = rng.random()
                status = (
                    WriteOffStatus.APPROVED
                    if roll < 0.7
                    else WriteOffStatus.PENDING
                    if roll < 0.85
                    else WriteOffStatus.REJECTED
                )
                with_deduction = rng.random() < 0.2
                charged = rng.choice(senders) if with_deduction else None
                request = models.WriteOffRequest(
                    outlet_id=outlet_id,
                    employee_id=sender,
                    product_id=product_id,
                    quantity=quantity,
                    unit='граммы',
                    reason_code=reason,
                    deduction_type=DeductionType.WITH_DEDUCTION if with_deduction else DeductionType.NO_DEDUCTION,
                    charged_employee_id=charged,
                    comment='Демо-история списаний для аналитики и KPI',
                    status=status,
                    created_at=created_at,
                )
                if status != WriteOffStatus.PENDING:
                    request.reviewer_id = reviewer_by_outlet.get(outlet_id)
                    request.reviewed_at = created_at + timedelta(minutes=rng.randint(5, 120))
                if status == WriteOffStatus.REJECTED:
                    request.rejection_reason = 'Недостаточно доказательств'
                if status == WriteOffStatus.APPROVED:
                    request.iiko_sync_status = 'not_configured'
                session.add(request)
                await session.flush()
                if status == WriteOffStatus.APPROVED:
                    movements.append(
                        models.InventoryMovement(
                            outlet_id=outlet_id,
                            product_id=product_id,
                            movement_type=MovementType.WRITE_OFF,
                            quantity=-abs(quantity),
                            source_request_id=request.id,
                            created_at=created_at,
                        )
                    )

    # Supplies + a small unexplained variance per outlet/product for reconciliation.
    for outlet_id in outlet_ids:
        for product_id in product_ids:
            movements.append(
                models.InventoryMovement(
                    outlet_id=outlet_id,
                    product_id=product_id,
                    movement_type=MovementType.SUPPLY,
                    quantity=round(rng.uniform(200, 600), 1),
                    external_source='demo:supply',
                    created_at=now - timedelta(days=15),
                )
            )
            if rng.random() < 0.4:
                movements.append(
                    models.InventoryMovement(
                        outlet_id=outlet_id,
                        product_id=product_id,
                        movement_type=MovementType.COUNT_ADJUSTMENT,
                        quantity=-round(rng.uniform(5, 40), 1),
                        created_at=now - timedelta(days=1),
                    )
                )
    for movement in movements:
        session.add(movement)
    await session.flush()
