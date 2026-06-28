from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models
from ..domain.enums import DeductionType, MovementType, WriteOffStatus
from ..integrations.iiko.types import IikoSyncResult, WriteOffActCommand, WriteOffSink
from ..schemas import CreateWriteOffRequest, ReviewWriteOffRequest
from ..settings import Settings
from . import audit_service, inventory_service
from .errors import ConflictError, NotFoundError, ServiceError


async def create_request(
    session: AsyncSession, data: CreateWriteOffRequest
) -> models.WriteOffRequest:
    if await session.get(models.Outlet, data.outlet_id) is None:
        raise NotFoundError('outlet_not_found')
    if await session.get(models.Employee, data.employee_id) is None:
        raise NotFoundError('employee_not_found')
    if await session.get(models.Product, data.product_id) is None:
        raise NotFoundError('product_not_found')
    if data.photo_id and await session.get(models.Photo, data.photo_id) is None:
        raise NotFoundError('photo_not_found')
    if data.deduction_type == DeductionType.WITH_DEDUCTION:
        if not data.charged_employee_id:
            raise ServiceError('charged_employee_required')
        if await session.get(models.Employee, data.charged_employee_id) is None:
            raise NotFoundError('charged_employee_not_found')

    if data.photo_id:
        photo = await session.get(models.Photo, data.photo_id)
        if photo and 'duplicate_photo_hash' in (photo.validation_errors or []):
            raise ConflictError('duplicate_photo')

    request = models.WriteOffRequest(
        outlet_id=data.outlet_id,
        employee_id=data.employee_id,
        product_id=data.product_id,
        photo_id=data.photo_id,
        quantity=data.quantity,
        unit=data.unit,
        reason_code=data.reason_code,
        deduction_type=data.deduction_type,
        charged_employee_id=data.charged_employee_id,
        comment=data.comment,
        status=WriteOffStatus.PENDING,
        created_at=datetime.now(UTC),
    )
    session.add(request)
    await session.flush()
    await audit_service.record_event(
        session,
        actor_id=data.employee_id,
        entity_type='write_off_request',
        entity_id=request.id,
        action='created',
        payload={'product_id': data.product_id, 'quantity': data.quantity},
    )
    return request


async def list_requests(
    session: AsyncSession, *, status: str | None = None, employee_id: str | None = None
) -> list[models.WriteOffRequest]:
    query = select(models.WriteOffRequest).order_by(models.WriteOffRequest.created_at.desc())
    if status:
        query = query.where(models.WriteOffRequest.status == status)
    if employee_id:
        query = query.where(models.WriteOffRequest.employee_id == employee_id)
    result = await session.execute(query)
    return list(result.scalars().all())


async def get_request(session: AsyncSession, request_id: str) -> models.WriteOffRequest:
    request = await session.get(models.WriteOffRequest, request_id)
    if request is None:
        raise NotFoundError('write_off_not_found')
    return request


async def review_request(
    session: AsyncSession,
    request_id: str,
    data: ReviewWriteOffRequest,
    *,
    settings: Settings,
    sink: WriteOffSink,
) -> models.WriteOffRequest:
    request = await session.get(models.WriteOffRequest, request_id)
    if request is None:
        raise NotFoundError('write_off_not_found')
    if request.status != WriteOffStatus.PENDING:
        raise ConflictError('write_off_already_reviewed')

    now = datetime.now(UTC)
    request.reviewer_id = data.reviewer_id
    request.reviewed_at = now

    if data.decision == 'rejected':
        request.status = WriteOffStatus.REJECTED
        request.rejection_reason = data.rejection_reason or 'Отклонено проверяющим'
        await audit_service.record_event(
            session,
            actor_id=data.reviewer_id,
            entity_type='write_off_request',
            entity_id=request.id,
            action='rejected',
            payload={'reason': request.rejection_reason},
        )
        await session.flush()
        return request

    request.status = WriteOffStatus.APPROVED
    await inventory_service.add_movement(
        session,
        outlet_id=request.outlet_id,
        product_id=request.product_id,
        movement_type=MovementType.WRITE_OFF,
        quantity=-abs(request.quantity),
        source_request_id=request.id,
    )
    await audit_service.record_event(
        session,
        actor_id=data.reviewer_id,
        entity_type='write_off_request',
        entity_id=request.id,
        action='approved',
        payload={'quantity': request.quantity},
    )

    sync_result = await _sync_to_iiko(session, request, settings=settings, sink=sink)
    request.iiko_sync_status = sync_result.status
    request.iiko_external_id = sync_result.external_id
    request.iiko_error = sync_result.error
    await session.flush()
    return request


async def _sync_to_iiko(
    session: AsyncSession,
    request: models.WriteOffRequest,
    *,
    settings: Settings,
    sink: WriteOffSink,
) -> IikoSyncResult:
    job = models.IikoSyncJob(
        entity_type='write_off_request',
        entity_id=request.id,
        operation='create_write_off_act',
        status='pending',
        attempts=1,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(job)

    if not sink.configured:
        job.status = 'not_configured'
        await session.flush()
        return IikoSyncResult(status='not_configured', error='iiko Server not configured')

    outlet = await session.get(models.Outlet, request.outlet_id)
    product = await session.get(models.Product, request.product_id)
    store_id = (outlet.iiko_store_id if outlet else None) or (settings.iiko_server_store_id or '')
    command = WriteOffActCommand(
        request_id=request.id,
        store_id=store_id,
        account_id=settings.iiko_server_account_id,
        document_number=request.id,
        date_incoming=request.created_at.strftime('%Y-%m-%dT%H:%M:%S'),
        items=[
            {
                'product_id': (product.iiko_product_id if product else None) or request.product_id,
                'quantity': abs(request.quantity),
            }
        ],
        comment=request.comment,
    )
    result = await sink.create_write_off_act(command)
    job.status = result.status
    job.external_id = result.external_id
    job.last_error = result.error
    job.updated_at = datetime.now(UTC)
    await session.flush()
    return result
