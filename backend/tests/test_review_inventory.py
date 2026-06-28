from __future__ import annotations

from litestar.testing import TestClient


def _create_request(client: TestClient) -> str:
    employee = client.post('/auth/login', json={'pin': '1111'}).json()['data']
    product = client.get('/products').json()['data'][0]
    created = client.post(
        '/write-offs',
        json={
            'outlet_id': employee['outlet']['id'],
            'employee_id': employee['id'],
            'product_id': product['id'],
            'quantity': 5,
            'unit': product['unit'],
            'reason_code': 'OVERCOOKED',
            'deduction_type': 'NO_DEDUCTION',
            'comment': 'Партия пережарена в час пик',
        },
    )
    return created.json()['data']['id']


def test_approval_creates_negative_inventory_movement(client: TestClient) -> None:
    request_id = _create_request(client)

    reviewed = client.patch(
        f'/write-offs/{request_id}/review',
        json={'reviewer_id': 'employee-reviewer-1', 'decision': 'approved'},
    )

    assert reviewed.status_code == 200
    payload = reviewed.json()['data']
    assert payload['status'] == 'approved'
    assert payload['iiko_sync']['status'] == 'not_configured'

    movements = client.get('/inventory/movements').json()['data']
    write_offs = [m for m in movements if m['source_request_id'] == request_id]
    assert len(write_offs) == 1
    assert write_offs[0]['quantity'] == -5
    assert write_offs[0]['movement_type'] == 'WRITE_OFF'


def test_rejection_creates_no_movement(client: TestClient) -> None:
    request_id = _create_request(client)

    reviewed = client.patch(
        f'/write-offs/{request_id}/review',
        json={'reviewer_id': 'employee-reviewer-1', 'decision': 'rejected', 'rejection_reason': 'Нет фото'},
    )

    assert reviewed.json()['data']['status'] == 'rejected'
    movements = client.get('/inventory/movements').json()['data']
    assert not [m for m in movements if m['source_request_id'] == request_id]


def test_double_review_conflicts(client: TestClient) -> None:
    request_id = _create_request(client)
    body = {'reviewer_id': 'employee-reviewer-1', 'decision': 'approved'}
    client.patch(f'/write-offs/{request_id}/review', json=body)

    second = client.patch(f'/write-offs/{request_id}/review', json=body)
    assert second.status_code == 409
