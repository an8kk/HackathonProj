from __future__ import annotations

from litestar.testing import TestClient

from helpers import token_for


def test_protected_route_requires_bearer_token(raw_client: TestClient) -> None:
    assert raw_client.get('/products').status_code == 401


def test_invalid_token_is_rejected(raw_client: TestClient) -> None:
    response = raw_client.get('/products', headers={'Authorization': 'Bearer not-a-jwt'})
    assert response.status_code == 401


def test_authenticated_user_can_read(raw_client: TestClient) -> None:
    headers = {'Authorization': f'Bearer {token_for(raw_client, "1111")}'}
    assert raw_client.get('/products', headers=headers).status_code == 200


def test_sender_cannot_access_admin(raw_client: TestClient) -> None:
    headers = {'Authorization': f'Bearer {token_for(raw_client, "1111")}'}
    response = raw_client.post(
        '/admin/products',
        headers=headers,
        json={'name': 'X', 'unit': 'штуки', 'cost_per_unit': 1},
    )
    assert response.status_code == 403


def test_sender_cannot_review(raw_client: TestClient) -> None:
    headers = {'Authorization': f'Bearer {token_for(raw_client, "1111")}'}
    response = raw_client.patch(
        '/write-offs/does-not-matter/review',
        headers=headers,
        json={'reviewer_id': 'x', 'decision': 'approved'},
    )
    assert response.status_code == 403


def test_reviewer_can_reach_review_route(raw_client: TestClient) -> None:
    headers = {'Authorization': f'Bearer {token_for(raw_client, "2222")}'}
    # passes the role guard, then 404 because the write-off id is unknown
    response = raw_client.patch(
        '/write-offs/unknown-id/review',
        headers=headers,
        json={'reviewer_id': 'employee-reviewer-1', 'decision': 'approved'},
    )
    assert response.status_code == 404


def test_owner_can_access_admin(raw_client: TestClient) -> None:
    headers = {'Authorization': f'Bearer {token_for(raw_client, "9999")}'}
    response = raw_client.post(
        '/admin/products',
        headers=headers,
        json={'name': 'Кола', 'unit': 'штуки', 'cost_per_unit': 250},
    )
    assert response.status_code == 201
