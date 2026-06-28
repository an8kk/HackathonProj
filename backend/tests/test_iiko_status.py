from __future__ import annotations

from litestar.testing import TestClient


def test_iiko_status_describes_write_off_act_integration(client: TestClient) -> None:
    data = client.get('/integrations/iiko/status').json()['data']

    assert data['provider'] == 'iiko Server API'
    assert data['write_off_act_endpoint'] == '/resto/api/documents/import/writeoffDocument'
    assert data['configured'] is False
    assert data['write_off_act_endpoint_available'] is False
