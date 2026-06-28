from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class IikoSyncResult:
    status: str
    external_id: str | None = None
    error: str | None = None
    request_xml: str | None = None


@dataclass(frozen=True)
class WriteOffActCommand:
    request_id: str
    store_id: str
    account_id: str | None
    document_number: str
    date_incoming: str
    items: list[dict[str, Any]]
    comment: str


class WriteOffSink(Protocol):
    @property
    def configured(self) -> bool: ...

    async def create_write_off_act(self, command: WriteOffActCommand) -> IikoSyncResult: ...


IIKOWEB_SUPPORTED_ENDPOINTS = [
    '/api/auth/login',
    '/api/auth',
    '/api/auth/logout',
    '/api/stores/list',
    '/api/stores/select/{store_id}',
    '/api/store/get/{store_id}',
    '/api/external-menu',
    '/api/external-menu/{menu_id}',
    '/api/olap/init',
    '/api/olap/fetch-status/{fetch_id}',
    '/api/olap/fetch/{fetch_id}/json',
    '/api/olap/help/fields',
    '/api/report/guestcheck',
    '/api/report/guest/check/detail',
    '/api/kpi/dashboard/get-data',
]

IIKO_SERVER_WRITE_OFF_ENDPOINT = '/resto/api/documents/import/writeoffDocument'
