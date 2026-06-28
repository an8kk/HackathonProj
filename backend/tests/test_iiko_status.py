from __future__ import annotations

from litestar.testing import TestClient


def test_iiko_status_documents_both_apis(client: TestClient) -> None:
    data = client.get('/integrations/iiko/status').json()['data']

    assert data['iiko_web']['write_off_act_endpoint_available'] is False
    assert '/api/olap/init' in data['iiko_web']['supported_endpoints']
    assert data['iiko_server']['write_off_act_endpoint'] == (
        '/resto/api/documents/import/writeoffDocument'
    )
    assert data['iiko_server']['configured'] is False
