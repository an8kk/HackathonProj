from __future__ import annotations

import httpx

from bahandi_backend.integrations.iiko.web_client import IikoWebClient
from bahandi_backend.settings import Settings


def _settings() -> Settings:
    return Settings(iiko_web_login='demo', iiko_web_password='demo')


def _transport(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url='https://iikoweb.test')


async def test_list_stores_authenticates_then_fetches() -> None:
    seen_paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_paths.append(request.url.path)
        if request.url.path == '/api/auth/login':
            return httpx.Response(200, json={'token': 'session'})
        if request.url.path == '/api/stores/list':
            return httpx.Response(200, json=[{'id': 550, 'name': 'Mega'}])
        return httpx.Response(404)

    client = IikoWebClient(_settings(), client=_transport(handler))
    stores = await client.list_stores()

    assert stores == [{'id': 550, 'name': 'Mega'}]
    assert seen_paths == ['/api/auth/login', '/api/stores/list']


async def test_external_menus_are_returned() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == '/api/auth/login':
            return httpx.Response(200, json={})
        if request.url.path == '/api/external-menu':
            return httpx.Response(200, json=[{'id': 13, 'name': 'Delivery'}])
        return httpx.Response(404)

    client = IikoWebClient(_settings(), client=_transport(handler))
    menus = await client.list_external_menus()

    assert menus[0]['id'] == 13
