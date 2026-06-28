from __future__ import annotations

from typing import Any

from ...settings import Settings
from .types import IIKO_SERVER_WRITE_OFF_ENDPOINT


def integration_status(settings: Settings) -> dict[str, Any]:
    """Describe the only iiko integration we need: write-off act creation.

    Approved write-offs are pushed to iiko as a warehouse write-off act
    (акт списания) via the iiko Server API, which deducts iiko inventory.
    """
    simulated = settings.iiko_simulate and not settings.iiko_server_configured
    mode = 'live' if settings.iiko_server_configured else 'simulated' if simulated else 'disabled'
    return {
        'provider': 'iiko Server API',
        'purpose': 'create write-off act, transfer data to iiko, auto-deduct inventory',
        'mode': mode,
        'configured': settings.iiko_server_configured or simulated,
        'simulated': simulated,
        'base_url': settings.iiko_server_base_url,
        'write_off_act_endpoint': IIKO_SERVER_WRITE_OFF_ENDPOINT,
        'write_off_act_endpoint_available': settings.iiko_server_configured or simulated,
        'note': (
            'Live mode posts the writeoffDocument to a real iiko Server. Simulated mode '
            '(IIKO_SIMULATE) returns a successful act for demos without a live iiko.'
        ),
    }
