from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models
from ..schemas import (
    CreateEmployeeRequest,
    CreateNormRequest,
    CreateOutletRequest,
    CreateProductRequest,
    UpdateEmployeeRequest,
)
from ..security import hash_pin
from .errors import NotFoundError


async def list_outlets(session: AsyncSession) -> list[models.Outlet]:
    result = await session.execute(select(models.Outlet).order_by(models.Outlet.name))
    return list(result.scalars().all())


async def list_employees(
    session: AsyncSession, *, outlet_id: str | None = None
) -> list[models.Employee]:
    query = select(models.Employee).order_by(models.Employee.name)
    if outlet_id:
        query = query.where(models.Employee.outlet_id == outlet_id)
    result = await session.execute(query)
    return list(result.scalars().all())


async def list_products(session: AsyncSession) -> list[models.Product]:
    result = await session.execute(select(models.Product).order_by(models.Product.name))
    return list(result.scalars().all())


async def get_product(session: AsyncSession, product_id: str) -> models.Product:
    product = await session.get(models.Product, product_id)
    if product is None:
        raise NotFoundError('product_not_found')
    return product


async def create_outlet(session: AsyncSession, data: CreateOutletRequest) -> models.Outlet:
    outlet = models.Outlet(
        name=data.name,
        address=data.address,
        iiko_store_id=data.iiko_store_id,
        created_at=datetime.now(UTC),
    )
    session.add(outlet)
    await session.flush()
    return outlet


async def create_employee(session: AsyncSession, data: CreateEmployeeRequest) -> models.Employee:
    if await session.get(models.Outlet, data.outlet_id) is None:
        raise NotFoundError('outlet_not_found')
    employee = models.Employee(
        outlet_id=data.outlet_id,
        name=data.name,
        role=data.role,
        pin_hash=hash_pin(data.pin),
        created_at=datetime.now(UTC),
    )
    session.add(employee)
    await session.flush()
    await session.refresh(employee)
    return employee


async def update_employee(
    session: AsyncSession, employee_id: str, data: UpdateEmployeeRequest
) -> models.Employee:
    employee = await session.get(models.Employee, employee_id)
    if employee is None:
        raise NotFoundError('employee_not_found')
    if data.name is not None:
        employee.name = data.name
    if data.role is not None:
        employee.role = data.role
    if data.pin is not None:
        employee.pin_hash = hash_pin(data.pin)
    if data.active is not None:
        employee.active = data.active
    await session.flush()
    await session.refresh(employee)
    return employee


async def create_product(session: AsyncSession, data: CreateProductRequest) -> models.Product:
    product = models.Product(
        name=data.name,
        unit=data.unit,
        cost_per_unit=data.cost_per_unit,
        iiko_product_id=data.iiko_product_id,
        created_at=datetime.now(UTC),
    )
    session.add(product)
    await session.flush()

    if data.norm_waste_pct:
        session.add(
            models.WasteNorm(
                product_id=product.id,
                outlet_id=None,
                max_waste_pct=data.norm_waste_pct,
                effective_from=datetime.now(UTC),
            )
        )
    await session.flush()
    return product


async def list_norms(
    session: AsyncSession, *, outlet_id: str | None = None, product_id: str | None = None
) -> list[models.WasteNorm]:
    query = select(models.WasteNorm)
    if outlet_id:
        query = query.where(models.WasteNorm.outlet_id == outlet_id)
    if product_id:
        query = query.where(models.WasteNorm.product_id == product_id)
    result = await session.execute(query)
    return list(result.scalars().all())


async def create_norm(session: AsyncSession, data: CreateNormRequest) -> models.WasteNorm:
    if await session.get(models.Product, data.product_id) is None:
        raise NotFoundError('product_not_found')
    if data.outlet_id and await session.get(models.Outlet, data.outlet_id) is None:
        raise NotFoundError('outlet_not_found')
    norm = models.WasteNorm(
        product_id=data.product_id,
        outlet_id=data.outlet_id,
        max_waste_pct=data.max_waste_pct,
        effective_from=data.effective_from or datetime.now(UTC),
    )
    session.add(norm)
    await session.flush()
    return norm
