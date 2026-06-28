from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models
from ..domain.enums import DeductionType, WriteOffStatus


async def _load(session: AsyncSession) -> tuple[list[models.WriteOffRequest], dict, dict, dict]:
    requests = list((await session.execute(select(models.WriteOffRequest))).scalars().all())
    employees = {e.id: e for e in (await session.execute(select(models.Employee))).scalars()}
    products = {p.id: p for p in (await session.execute(select(models.Product))).scalars()}
    outlets = {o.id: o for o in (await session.execute(select(models.Outlet))).scalars()}
    return requests, employees, products, outlets


async def employee_analytics(session: AsyncSession) -> list[dict]:
    requests, employees, _, outlets = await _load(session)
    by_employee: dict[str, list[models.WriteOffRequest]] = defaultdict(list)
    for request in requests:
        by_employee[request.employee_id].append(request)

    rows: list[dict] = []
    for employee in employees.values():
        items = by_employee.get(employee.id, [])
        charged = sum(1 for r in requests if r.charged_employee_id == employee.id)
        rows.append(
            {
                'employee_id': employee.id,
                'employee_name': employee.name,
                'outlet_name': outlets[employee.outlet_id].name if employee.outlet_id in outlets else None,
                'total_requests': len(items),
                'approved': sum(1 for r in items if r.status == WriteOffStatus.APPROVED),
                'rejected': sum(1 for r in items if r.status == WriteOffStatus.REJECTED),
                'with_deduction': sum(1 for r in items if r.deduction_type == DeductionType.WITH_DEDUCTION),
                'times_charged': charged,
            }
        )
    rows.sort(key=lambda row: row['total_requests'], reverse=True)
    return rows


async def hourly_analytics(session: AsyncSession) -> list[dict]:
    requests, *_ = await _load(session)
    buckets: dict[int, int] = defaultdict(int)
    for request in requests:
        buckets[request.created_at.hour] += 1
    return [{'hour': hour, 'count': buckets.get(hour, 0)} for hour in range(24)]


async def product_analytics(session: AsyncSession) -> list[dict]:
    requests, _, products, _ = await _load(session)
    totals: dict[str, dict[str, float]] = defaultdict(lambda: {'count': 0, 'quantity': 0.0, 'cost': 0.0})
    for request in requests:
        if request.status != WriteOffStatus.APPROVED:
            continue
        bucket = totals[request.product_id]
        bucket['count'] += 1
        bucket['quantity'] += request.quantity
        product = products.get(request.product_id)
        if product:
            bucket['cost'] += request.quantity * product.cost_per_unit

    rows = [
        {
            'product_id': product_id,
            'product_name': products[product_id].name if product_id in products else None,
            'write_off_count': int(bucket['count']),
            'quantity': round(bucket['quantity'], 3),
            'cost_value': round(bucket['cost'], 2),
        }
        for product_id, bucket in totals.items()
    ]
    rows.sort(key=lambda row: row['cost_value'], reverse=True)
    return rows


async def summary(session: AsyncSession) -> dict:
    requests, _, products, _ = await _load(session)
    approved = [r for r in requests if r.status == WriteOffStatus.APPROVED]
    total_cost = 0.0
    for request in approved:
        product = products.get(request.product_id)
        if product:
            total_cost += request.quantity * product.cost_per_unit
    return {
        'total_requests': len(requests),
        'pending': sum(1 for r in requests if r.status == WriteOffStatus.PENDING),
        'approved': len(approved),
        'rejected': sum(1 for r in requests if r.status == WriteOffStatus.REJECTED),
        'approved_cost_value': round(total_cost, 2),
    }


async def outlet_analytics(session: AsyncSession) -> list[dict]:
    """Per-outlet rollup for the network/locations views (all from real data)."""
    requests, _employees, products, outlets = await _load(session)
    movements = list((await session.execute(select(models.InventoryMovement))).scalars().all())

    by_outlet: dict[str, list[models.WriteOffRequest]] = defaultdict(list)
    for request in requests:
        by_outlet[request.outlet_id].append(request)

    variance_by_outlet: dict[str, float] = defaultdict(float)
    for movement in movements:
        if movement.movement_type == 'COUNT_ADJUSTMENT':
            variance_by_outlet[movement.outlet_id] += abs(movement.quantity)

    rows: list[dict] = []
    for outlet_id, outlet in outlets.items():
        items = by_outlet.get(outlet_id, [])
        approved = [r for r in items if r.status == WriteOffStatus.APPROVED]
        cost = 0.0
        for r in approved:
            product = products.get(r.product_id)
            if product:
                cost += r.quantity * product.cost_per_unit
        variance = round(variance_by_outlet.get(outlet_id, 0.0), 1)
        zone = 'red' if variance > 120 or cost > 600_000 else 'amber' if variance > 50 else 'green'
        rows.append(
            {
                'outlet_id': outlet_id,
                'outlet_name': outlet.name,
                'address': outlet.address,
                'total_requests': len(items),
                'approved': len(approved),
                'pending': sum(1 for r in items if r.status == WriteOffStatus.PENDING),
                'rejected': sum(1 for r in items if r.status == WriteOffStatus.REJECTED),
                'write_off_cost': round(cost, 2),
                'unexplained_variance': variance,
                'zone': zone,
            }
        )
    rows.sort(key=lambda row: row['write_off_cost'], reverse=True)
    return rows


async def investigations(session: AsyncSession) -> list[dict]:
    """Flag suspicious clusters: repeated employee+product+reason combinations."""
    requests, employees, products, _ = await _load(session)
    clusters: dict[tuple[str, str, str], list[models.WriteOffRequest]] = defaultdict(list)
    for request in requests:
        clusters[(request.employee_id, request.product_id, request.reason_code)].append(request)

    findings: list[dict] = []
    for (employee_id, product_id, reason), items in clusters.items():
        if len(items) < 3:
            continue
        findings.append(
            {
                'employee_id': employee_id,
                'employee_name': employees[employee_id].name if employee_id in employees else None,
                'product_id': product_id,
                'product_name': products[product_id].name if product_id in products else None,
                'reason_code': reason,
                'occurrences': len(items),
                'severity': 'high' if len(items) >= 5 else 'medium',
            }
        )
    findings.sort(key=lambda row: row['occurrences'], reverse=True)
    return findings
