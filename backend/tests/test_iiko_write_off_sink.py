from __future__ import annotations

import httpx

from bahandi_backend.integrations.iiko.server_sink import (
    IikoServerWriteOffSink,
    NotConfiguredWriteOffSink,
    build_write_off_xml,
)
from bahandi_backend.integrations.iiko.types import WriteOffActCommand
from bahandi_backend.settings import Settings


def _command() -> WriteOffActCommand:
    return WriteOffActCommand(
        request_id='writeoff-1',
        store_id='store-guid',
        account_id='account-guid',
        document_number='writeoff-1',
        date_incoming='2026-06-28T10:00:00',
        items=[{'product_id': 'product-guid', 'quantity': 3.0}],
        comment='Пережарено',
    )


def test_write_off_xml_matches_iiko_server_schema() -> None:
    xml = build_write_off_xml(_command())

    assert '<document>' in xml
    assert '<storeId>store-guid</storeId>' in xml
    assert '<accountId>account-guid</accountId>' in xml
    assert '<status>NEW</status>' in xml
    assert '<productId>product-guid</productId>' in xml
    assert '<amount>3.000</amount>' in xml


def test_not_configured_sink_reports_missing_credentials() -> None:
    sink = NotConfiguredWriteOffSink()
    assert sink.configured is False


async def test_server_sink_creates_write_off_act() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(f'{request.method} {request.url.path}')
        if request.url.path == '/resto/api/auth':
            return httpx.Response(200, text='token-123')
        if request.url.path == '/resto/api/documents/import/writeoffDocument':
            assert b'<storeId>store-guid</storeId>' in request.content
            return httpx.Response(200, text='<document><id>doc-777</id></document>')
        if request.url.path == '/resto/api/logout':
            return httpx.Response(200, text='')
        return httpx.Response(404)

    settings = Settings(
        iiko_server_base_url='https://resto.test',
        iiko_server_login='admin',
        iiko_server_password_sha1='deadbeef',
        iiko_server_store_id='store-guid',
        iiko_server_account_id='account-guid',
    )
    transport = httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url='https://resto.test')
    sink = IikoServerWriteOffSink(settings, client=transport)

    result = await sink.create_write_off_act(_command())

    assert result.status == 'synced'
    assert result.external_id == 'doc-777'
    assert 'GET /resto/api/auth' in calls
    assert 'POST /resto/api/documents/import/writeoffDocument' in calls
    assert 'GET /resto/api/logout' in calls


async def test_server_sink_reports_failure_on_http_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == '/resto/api/auth':
            return httpx.Response(200, text='token-123')
        return httpx.Response(500, text='boom')

    settings = Settings(
        iiko_server_base_url='https://resto.test',
        iiko_server_login='admin',
        iiko_server_password_sha1='deadbeef',
        iiko_server_store_id='store-guid',
    )
    transport = httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url='https://resto.test')
    sink = IikoServerWriteOffSink(settings, client=transport)

    result = await sink.create_write_off_act(_command())

    assert result.status == 'failed'
    assert result.error
