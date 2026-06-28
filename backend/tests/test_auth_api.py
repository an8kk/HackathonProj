from __future__ import annotations

from litestar.testing import TestClient


def test_login_with_valid_pin_returns_profile_and_token(client: TestClient) -> None:
    response = client.post('/auth/login', json={'pin': '1111'})

    assert response.status_code == 200
    data = response.json()['data']
    assert data['role'] == 'sender'
    assert data['outlet']['name'] == 'Mega Silk Way'
    assert data['token']


def test_login_with_invalid_pin_is_unauthorized(client: TestClient) -> None:
    response = client.post('/auth/login', json={'pin': '0000'})

    assert response.status_code == 401
    assert response.json()['error'] == 'invalid_pin'
