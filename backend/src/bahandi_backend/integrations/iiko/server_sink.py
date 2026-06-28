from __future__ import annotations

from xml.sax.saxutils import escape

import httpx

from ...settings import Settings
from .types import IIKO_SERVER_WRITE_OFF_ENDPOINT, IikoSyncResult, WriteOffActCommand


def build_write_off_xml(command: WriteOffActCommand) -> str:
    """Build an iiko Server `writeoffDocument` import body.

    Matches the documented iiko Server API document import schema used by
    ``POST /resto/api/documents/import/writeoffDocument``.
    """
    item_xml = ''.join(
        '<item>'
        f'<productId>{escape(str(item["product_id"]))}</productId>'
        f'<amount>{float(item["quantity"]):.3f}</amount>'
        '</item>'
        for item in command.items
    )
    account_xml = f'<accountId>{escape(command.account_id)}</accountId>' if command.account_id else ''
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<document>'
        f'<documentNumber>{escape(command.document_number)}</documentNumber>'
        f'<dateIncoming>{escape(command.date_incoming)}</dateIncoming>'
        '<status>NEW</status>'
        f'<comment>{escape(command.comment)}</comment>'
        f'<storeId>{escape(command.store_id)}</storeId>'
        f'{account_xml}'
        f'<items>{item_xml}</items>'
        '</document>'
    )


class NotConfiguredWriteOffSink:
    """Used when no iiko Server credentials are present."""

    configured = False

    async def create_write_off_act(self, command: WriteOffActCommand) -> IikoSyncResult:
        return IikoSyncResult(
            status='not_configured',
            error='iiko Server credentials are not configured',
            request_xml=build_write_off_xml(command),
        )


class SimulatedWriteOffSink:
    """Demo mode: behaves like a working iiko Server without real credentials.
    Builds the real `writeoffDocument` XML and returns a successful sync with a
    generated act number, so the end-to-end flow shows iiko confirmation. Enabled
    via IIKO_SIMULATE for hackathon demos where a live iiko is unavailable.
    """

    configured = True

    async def create_write_off_act(self, command: WriteOffActCommand) -> IikoSyncResult:
        body = build_write_off_xml(command)
        external_id = f'AKT-{command.request_id[:8].upper()}'
        return IikoSyncResult(status='synced', external_id=external_id, request_xml=body)


class IikoServerWriteOffSink:
    """Creates a write-off act (акт списания) via the iiko Server API.

    Flow:
      1. ``GET /resto/api/auth?login=&pass=<sha1>`` -> token (one license slot)
      2. ``POST /resto/api/documents/import/writeoffDocument?key=<token>`` with XML
      3. ``GET /resto/api/logout?key=<token>`` to release the slot
    """

    def __init__(self, settings: Settings, *, client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._injected_client = client

    @property
    def configured(self) -> bool:
        return self._settings.iiko_server_configured

    def _new_client(self) -> httpx.AsyncClient:
        if self._injected_client is not None:
            return self._injected_client
        return httpx.AsyncClient(base_url=self._settings.iiko_server_base_url or '', timeout=30)

    async def create_write_off_act(self, command: WriteOffActCommand) -> IikoSyncResult:
        body = build_write_off_xml(command)
        client = self._new_client()
        token: str | None = None
        try:
            auth = await client.get(
                '/resto/api/auth',
                params={
                    'login': self._settings.iiko_server_login,
                    'pass': self._settings.iiko_server_password_sha1,
                },
            )
            auth.raise_for_status()
            token = auth.text.strip()
            if not token:
                return IikoSyncResult(status='failed', error='empty_auth_token', request_xml=body)

            response = await client.post(
                IIKO_SERVER_WRITE_OFF_ENDPOINT,
                params={'key': token},
                content=body.encode('utf-8'),
                headers={'Content-Type': 'application/xml'},
            )
            response.raise_for_status()
            external_id = _extract_external_id(response.text)
            return IikoSyncResult(status='synced', external_id=external_id, request_xml=body)
        except httpx.HTTPError as error:
            return IikoSyncResult(status='failed', error=str(error), request_xml=body)
        finally:
            if token:
                try:
                    await client.get('/resto/api/logout', params={'key': token})
                except httpx.HTTPError:
                    pass
            if self._injected_client is None:
                await client.aclose()


def _extract_external_id(response_text: str) -> str | None:
    import re

    for pattern in (r'<id>([^<]+)</id>', r'<documentNumber>([^<]+)</documentNumber>'):
        match = re.search(pattern, response_text)
        if match:
            return match.group(1)
    return None
