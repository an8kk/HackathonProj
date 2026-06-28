from __future__ import annotations

from typing import Any

from ...settings import Settings
from .types import IIKO_SERVER_WRITE_OFF_ENDPOINT


def integration_status(settings: Settings) -> dict[str, Any]:
    """Describe the only iiko integration we need: write-off act creation.

    Approved write-offs are pushed to iiko as a warehouse write-off act
    (акт списания) via the iiko Server API, which deducts iiko inventory.
    """
    return {
        'provider': 'iiko Server API',
        'purpose': 'create write-off act, transfer data to iiko, auto-deduct inventory',
        'configured': settings.iiko_server_configured,
        'base_url': settings.iiko_server_base_url,
        'write_off_act_endpoint': IIKO_SERVER_WRITE_OFF_ENDPOINT,
        'write_off_act_endpoint_available': settings.iiko_server_configured,
        'note': (
            'Configure IIKO_SERVER_* (base URL, login, SHA1 password, store id, account id) '
            'to enable real write-off sync. Until then approved write-offs still post a local '
            'inventory movement and record an iiko sync status of not_configured.'
        ),
    }
