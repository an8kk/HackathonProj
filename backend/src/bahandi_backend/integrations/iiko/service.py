from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ...settings import Settings
from .types import IIKOWEB_SUPPORTED_ENDPOINTS
from .web_client import IikoWebClient


def integration_status(settings: Settings) -> dict[str, Any]:
    return {
        'iiko_web': {
            'provider': 'iikoWeb Public API',
            'configured': settings.iiko_web_configured,
            'base_url': settings.iiko_web_base_url,
            'supported_endpoints': IIKOWEB_SUPPORTED_ENDPOINTS,
            'write_off_act_endpoint_available': False,
        },
        'iiko_server': {
            'provider': 'iiko Server API',
            'configured': settings.iiko_server_configured,
            'base_url': settings.iiko_server_base_url,
            'write_off_act_endpoint': '/resto/api/documents/import/writeoffDocument',
            'write_off_act_endpoint_available': settings.iiko_server_configured,
        },
        'note': (
            'Reference data, sales, OLAP and KPI come from iikoWeb. Warehouse write-off acts '
            '(акт списания) are created via the iiko Server API writeoffDocument import. Configure '
            'IIKO_SERVER_* to enable real write-off sync.'
        ),
    }


async def sync_reference_data(
    session: AsyncSession, *, settings: Settings, client: IikoWebClient
) -> dict[str, Any]:
    del session
    if not client.configured:
        return {'status': 'not_configured', 'stores_imported': 0, 'menus_imported': 0}
    stores = await client.list_stores()
    menus = await client.list_external_menus()
    return {'status': 'synced', 'stores_imported': len(stores), 'menus_imported': len(menus)}
