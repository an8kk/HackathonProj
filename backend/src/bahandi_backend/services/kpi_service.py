from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models
from ..domain.enums import MetadataStatus, WriteOffStatus


async def outlet_kpis(session: AsyncSession) -> list[dict]:
    """Compute an outlet KPI that rewards transparent reporting and low
    unexplained loss, not merely a low number of write-offs.

    Score components (0..100):
      - photo metadata validity rate
      - reviewer approval rate (low rejection = clean reporting)
      - low unexplained inventory variance
    """
    requests = list((await session.execute(select(models.WriteOffRequest))).scalars().all())
    photos = {p.id: p for p in (await session.execute(select(models.Photo))).scalars()}
    movements = list((await session.execute(select(models.InventoryMovement))).scalars().all())
    outlets = {o.id: o for o in (await session.execute(select(models.Outlet))).scalars()}

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
        reviewed = [r for r in items if r.status in {WriteOffStatus.APPROVED, WriteOffStatus.REJECTED}]

        if items:
            valid_photos = sum(
                1
                for r in items
                if r.photo_id
                and photos.get(r.photo_id)
                and photos[r.photo_id].metadata_status == MetadataStatus.VALID
            )
            photo_score = 100 * valid_photos / len(items)
        else:
            photo_score = 100.0

        if reviewed:
            approval_score = 100 * sum(1 for r in reviewed if r.status == WriteOffStatus.APPROVED) / len(reviewed)
        else:
            approval_score = 100.0

        variance_penalty = min(variance_by_outlet.get(outlet_id, 0.0), 100.0)
        variance_score = max(0.0, 100.0 - variance_penalty)

        score = round(0.35 * photo_score + 0.30 * approval_score + 0.35 * variance_score, 1)
        rows.append(
            {
                'outlet_id': outlet_id,
                'outlet_name': outlet.name,
                'score': score,
                'photo_validity_score': round(photo_score, 1),
                'approval_score': round(approval_score, 1),
                'variance_score': round(variance_score, 1),
                'total_requests': len(items),
                'bonus_eligible': score >= 80,
            }
        )
    rows.sort(key=lambda row: row['score'], reverse=True)
    return rows
