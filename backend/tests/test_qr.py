from __future__ import annotations

from litestar.testing import TestClient


def test_product_qr_token_resolves_to_product(client: TestClient) -> None:
    product = client.get('/products').json()['data'][0]

    created = client.post(
        '/admin/qr-tokens', json={'entity_type': 'product', 'entity_id': product['id']}
    )
    assert created.status_code == 201
    token = created.json()['data']['token']
    assert created.json()['data']['url'].endswith(token)

    resolved = client.get(f'/qr/{token}')
    assert resolved.status_code == 200
    assert resolved.json()['data'] == {'entity_type': 'product', 'entity_id': product['id']}


def test_unknown_token_is_not_found(client: TestClient) -> None:
    assert client.get('/qr/does-not-exist').status_code == 404


def test_qr_for_missing_entity_is_rejected(client: TestClient) -> None:
    created = client.post(
        '/admin/qr-tokens', json={'entity_type': 'product', 'entity_id': 'missing'}
    )
    assert created.status_code == 404
