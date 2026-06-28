from __future__ import annotations

from typing import Any

import httpx

from ...settings import Settings


class IikoWebClient:
    """Client for the iikoWeb Public API (cloud reference data, sales, KPI).

    This API authenticates with a session cookie obtained from
    ``POST /api/auth/login`` and does NOT expose warehouse write-off act
    creation; that lives in the iiko Server API instead.
    """

    def __init__(self, settings: Settings, *, client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._injected_client = client

    @property
    def configured(self) -> bool:
        return self._settings.iiko_web_configured

    def _new_client(self) -> httpx.AsyncClient:
        if self._injected_client is not None:
            return self._injected_client
        return httpx.AsyncClient(base_url=self._settings.iiko_web_base_url, timeout=20)

    async def _authenticate(self, client: httpx.AsyncClient) -> None:
        if not self.configured:
            return
        response = await client.post(
            '/api/auth/login',
            json={'login': self._settings.iiko_web_login, 'password': self._settings.iiko_web_password},
        )
        response.raise_for_status()
        if self._settings.iiko_web_store_id is not None:
            select = await client.get(f'/api/stores/select/{self._settings.iiko_web_store_id}')
            select.raise_for_status()

    async def _call(self, method: str, path: str, **kwargs: Any) -> Any:
        client = self._new_client()
        try:
            await self._authenticate(client)
            response = await client.request(method, path, **kwargs)
            response.raise_for_status()
            return response.json()
        finally:
            if self._injected_client is None:
                await client.aclose()

    async def list_stores(self) -> list[dict[str, Any]]:
        payload = await self._call('GET', '/api/stores/list')
        return payload if isinstance(payload, list) else payload.get('data', [])

    async def list_external_menus(self) -> list[dict[str, Any]]:
        payload = await self._call('GET', '/api/external-menu')
        return payload if isinstance(payload, list) else payload.get('data', [])

    async def get_external_menu(self, menu_id: int) -> dict[str, Any]:
        return await self._call('GET', f'/api/external-menu/{menu_id}')

    async def guest_checks(self, date: str) -> Any:
        return await self._call(
            'GET', '/api/report/guestcheck', params={'dateFrom': date, 'dateTo': date}
        )

    async def kpi_data(self, body: dict[str, Any]) -> Any:
        return await self._call('POST', '/api/kpi/dashboard/get-data', json=body)
