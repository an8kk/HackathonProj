from __future__ import annotations

import base64
from typing import Any

from litestar import Request, Response, get, patch, post
from litestar.di import Provide
from sqlalchemy.ext.asyncio import AsyncSession

from .auth.guards import require_roles
from .db import models
from .integrations.iiko import service as iiko_service
from .integrations.iiko.factory import build_write_off_sink
from .photos.storage import LocalPhotoStorage, build_storage
from .services.errors import NotFoundError
from .schemas import (
    CreateEmployeeRequest,
    CreateNormRequest,
    CreateOutletRequest,
    CreateProductRequest,
    CreateQrTokenRequest,
    CreateWriteOffRequest,
    InventoryCountRequest,
    LoginRequest,
    PhotoAnalysisRequest,
    PhotoUploadRequest,
    ReviewWriteOffRequest,
    SupplyRequest,
)
from .serializers import (
    employee_dict,
    movement_dict,
    norm_dict,
    outlet_dict,
    photo_dict,
    product_dict,
    qr_token_dict,
    write_off_dict,
)
from .services import (
    analytics_service,
    audit_service,
    auth_service,
    catalog_service,
    inventory_service,
    kpi_service,
    photo_service,
    qr_service,
    writeoff_service,
)
from .settings import Settings


def ok(data: Any) -> dict[str, Any]:
    return {'success': True, 'data': data}


def provide_settings(request: Request) -> Settings:
    return request.app.state.settings


async def provide_session(request: Request) -> Any:
    factory = request.app.state.session_factory
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@get('/health')
async def health() -> dict[str, Any]:
    return {'status': 'ok', 'service': 'bahandi-litestar-backend'}


@post('/auth/login', status_code=200)
async def login(data: LoginRequest, db_session: AsyncSession, settings: Settings) -> dict[str, Any]:
    employee, token = await auth_service.login_with_pin(db_session, pin=data.pin, settings=settings)
    return ok({**employee_dict(employee), 'token': token})


@get('/outlets')
async def list_outlets(db_session: AsyncSession) -> dict[str, Any]:
    return ok([outlet_dict(o) for o in await catalog_service.list_outlets(db_session)])


@get('/employees')
async def list_employees(db_session: AsyncSession, request: Request) -> dict[str, Any]:
    outlet_id = request.query_params.get('outlet_id')
    employees = await catalog_service.list_employees(db_session, outlet_id=outlet_id)
    return ok([employee_dict(e) for e in employees])


@get('/products')
async def list_products(db_session: AsyncSession) -> dict[str, Any]:
    return ok([product_dict(p) for p in await catalog_service.list_products(db_session)])


@post('/admin/outlets', status_code=201, guards=[require_roles('owner')])
async def create_outlet(data: CreateOutletRequest, db_session: AsyncSession) -> dict[str, Any]:
    return ok(outlet_dict(await catalog_service.create_outlet(db_session, data)))


@post('/admin/employees', status_code=201, guards=[require_roles('owner')])
async def create_employee(data: CreateEmployeeRequest, db_session: AsyncSession) -> dict[str, Any]:
    return ok(employee_dict(await catalog_service.create_employee(db_session, data)))


@post('/admin/products', status_code=201, guards=[require_roles('owner')])
async def create_product(data: CreateProductRequest, db_session: AsyncSession) -> dict[str, Any]:
    return ok(product_dict(await catalog_service.create_product(db_session, data)))


@get('/norms')
async def list_norms(db_session: AsyncSession, request: Request) -> dict[str, Any]:
    norms = await catalog_service.list_norms(
        db_session,
        outlet_id=request.query_params.get('outlet_id'),
        product_id=request.query_params.get('product_id'),
    )
    return ok([norm_dict(n) for n in norms])


@post('/admin/norms', status_code=201, guards=[require_roles('owner')])
async def create_norm(data: CreateNormRequest, db_session: AsyncSession) -> dict[str, Any]:
    return ok(norm_dict(await catalog_service.create_norm(db_session, data)))


@post('/photos', status_code=201, guards=[require_roles('sender', 'reviewer', 'owner')])
async def upload_photo(
    data: PhotoUploadRequest, db_session: AsyncSession, settings: Settings, request: Request
) -> dict[str, Any]:
    photo = await photo_service.save_photo(
        db_session,
        data,
        settings=settings,
        analyzer=photo_service.build_analyzer(settings),
        storage=photo_service.build_storage(settings),
        outlet_id=request.query_params.get('outlet_id') or 'unknown',
    )
    return ok(photo_dict(photo))


@post('/photo-analysis/analyze', status_code=200)
async def analyze_photo(data: PhotoAnalysisRequest, settings: Settings) -> dict[str, Any]:
    analyzer = photo_service.build_analyzer(settings)
    content = base64.b64decode(data.image_base64)
    result = await analyzer.analyze(content=content, content_type=data.media_type)
    return ok(result)


@get('/photos/{photo_id:str}')
async def get_photo(photo_id: str, db_session: AsyncSession) -> dict[str, Any]:
    photo = await db_session.get(models.Photo, photo_id)
    if photo is None:
        raise NotFoundError('photo_not_found')
    return ok(photo_dict(photo))


@get('/write-offs')
async def list_write_offs(db_session: AsyncSession, request: Request) -> dict[str, Any]:
    requests = await writeoff_service.list_requests(
        db_session,
        status=request.query_params.get('status'),
        employee_id=request.query_params.get('employee_id'),
    )
    return ok([write_off_dict(r) for r in requests])


@get('/write-offs/{request_id:str}')
async def get_write_off(request_id: str, db_session: AsyncSession) -> dict[str, Any]:
    return ok(write_off_dict(await writeoff_service.get_request(db_session, request_id)))


@post('/write-offs', status_code=201, guards=[require_roles('sender', 'reviewer', 'owner')])
async def create_write_off(data: CreateWriteOffRequest, db_session: AsyncSession) -> dict[str, Any]:
    return ok(write_off_dict(await writeoff_service.create_request(db_session, data)))


@patch('/write-offs/{request_id:str}/review', guards=[require_roles('reviewer', 'owner')])
async def review_write_off(
    request_id: str, data: ReviewWriteOffRequest, db_session: AsyncSession, settings: Settings
) -> dict[str, Any]:
    request_obj = await writeoff_service.review_request(
        db_session,
        request_id,
        data,
        settings=settings,
        sink=build_write_off_sink(settings),
    )
    return ok(write_off_dict(request_obj))


@get('/inventory/movements')
async def list_movements(db_session: AsyncSession) -> dict[str, Any]:
    return ok([movement_dict(m) for m in await inventory_service.list_movements(db_session)])


@get('/inventory/balances')
async def inventory_balances(db_session: AsyncSession) -> dict[str, Any]:
    return ok(await inventory_service.balances(db_session))


@post('/inventory/supplies', status_code=201)
async def register_supply(data: SupplyRequest, db_session: AsyncSession) -> dict[str, Any]:
    return ok(movement_dict(await inventory_service.register_supply(db_session, data)))


@post('/inventory/counts', status_code=201)
async def record_count(data: InventoryCountRequest, db_session: AsyncSession) -> dict[str, Any]:
    count, adjustments = await inventory_service.record_count(db_session, data)
    return ok({'count_id': count.id, 'adjustments': [movement_dict(m) for m in adjustments]})


@get('/inventory/reconciliation')
async def inventory_reconciliation(db_session: AsyncSession, request: Request) -> dict[str, Any]:
    rows = await inventory_service.reconciliation(
        db_session, outlet_id=request.query_params.get('outlet_id')
    )
    return ok(rows)


@get('/analytics/summary')
async def analytics_summary(db_session: AsyncSession) -> dict[str, Any]:
    return ok(await analytics_service.summary(db_session))


@get('/analytics/employees')
async def analytics_employees(db_session: AsyncSession) -> dict[str, Any]:
    return ok(await analytics_service.employee_analytics(db_session))


@get('/analytics/products')
async def analytics_products(db_session: AsyncSession) -> dict[str, Any]:
    return ok(await analytics_service.product_analytics(db_session))


@get('/analytics/hourly')
async def analytics_hourly(db_session: AsyncSession) -> dict[str, Any]:
    return ok(await analytics_service.hourly_analytics(db_session))


@get('/analytics/investigations')
async def analytics_investigations(db_session: AsyncSession) -> dict[str, Any]:
    return ok(await analytics_service.investigations(db_session))


@get('/kpi/outlets')
async def kpi_outlets(db_session: AsyncSession) -> dict[str, Any]:
    return ok(await kpi_service.outlet_kpis(db_session))


@get('/audit/events')
async def audit_events(db_session: AsyncSession) -> dict[str, Any]:
    events = await audit_service.list_events(db_session)
    return ok(
        [
            {
                'id': e.id,
                'actor_id': e.actor_id,
                'entity_type': e.entity_type,
                'entity_id': e.entity_id,
                'action': e.action,
                'payload': e.payload,
                'created_at': e.created_at.isoformat(),
            }
            for e in events
        ]
    )


@post('/admin/qr-tokens', status_code=201, guards=[require_roles('owner')])
async def create_qr_token(
    data: CreateQrTokenRequest, db_session: AsyncSession, settings: Settings
) -> dict[str, Any]:
    token, url = await qr_service.create_token(db_session, data, settings=settings)
    return ok({**qr_token_dict(token), 'url': url})


@get('/qr/{token:str}')
async def resolve_qr_token(token: str, db_session: AsyncSession) -> dict[str, Any]:
    return ok(await qr_service.resolve_token(db_session, token))


@get('/integrations/iiko/status')
async def iiko_status(settings: Settings) -> dict[str, Any]:
    return ok(iiko_service.integration_status(settings))

_GUESSED_TYPES = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'}


@get('/media/{key:path}', media_type='application/octet-stream')
async def serve_media(key: str, settings: Settings) -> Response[bytes]:
    """Serve locally-stored photo bytes (S3 backend exposes object URLs directly)."""
    storage = build_storage(settings)
    if not isinstance(storage, LocalPhotoStorage):
        raise NotFoundError('media_not_available')
    storage_key = str(key).lstrip('/')
    try:
        data = await storage.read(storage_key)
    except FileNotFoundError as error:
        raise NotFoundError('media_not_found') from error
    from pathlib import Path as _Path

    media_type = _GUESSED_TYPES.get(_Path(storage_key).suffix.lower(), 'application/octet-stream')
    return Response(content=data, media_type=media_type)


PUBLIC_HANDLERS = [
    health,
    login,
    serve_media,
]

# Everything below requires a valid JWT (enforced by the router guard in app.py).
# Elevated actions additionally carry per-handler role guards.
PROTECTED_HANDLERS = [
    list_outlets,
    list_employees,
    list_products,
    create_outlet,
    create_employee,
    create_product,
    list_norms,
    create_norm,
    upload_photo,
    analyze_photo,
    get_photo,
    list_write_offs,
    get_write_off,
    create_write_off,
    review_write_off,
    list_movements,
    inventory_balances,
    register_supply,
    record_count,
    inventory_reconciliation,
    analytics_summary,
    analytics_employees,
    analytics_products,
    analytics_hourly,
    analytics_investigations,
    kpi_outlets,
    audit_events,
    create_qr_token,
    resolve_qr_token,
    iiko_status,
]

DEPENDENCIES = {
    'settings': Provide(provide_settings, sync_to_thread=False),
    'db_session': Provide(provide_session),
}
