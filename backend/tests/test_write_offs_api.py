from __future__ import annotations

from datetime import UTC, datetime

from litestar.testing import TestClient

from helpers import sample_image_base64


def _upload_photo(client: TestClient) -> str:
    response = client.post(
        '/photos',
        json={
            'filename': 'patty.png',
            'content_base64': sample_image_base64(),
            'content_type': 'image/png',
            'taken_at': datetime.now(UTC).isoformat(),
        },
    )
    return response.json()['data']['id']


def _ids(client: TestClient) -> dict[str, str]:
    employee = client.post('/auth/login', json={'pin': '1111'}).json()['data']
    product = client.get('/products').json()['data'][0]
    return {
        'employee_id': employee['id'],
        'outlet_id': employee['outlet']['id'],
        'product_id': product['id'],
        'unit': product['unit'],
    }


def test_sender_creates_write_off_request(client: TestClient) -> None:
    ids = _ids(client)
    photo_id = _upload_photo(client)

    response = client.post(
        '/write-offs',
        json={
            **ids,
            'photo_id': photo_id,
            'quantity': 3,
            'reason_code': 'OVERCOOKED',
            'deduction_type': 'NO_DEDUCTION',
            'comment': 'Пережарены во время обеда',
        },
    )

    assert response.status_code == 201
    data = response.json()['data']
    assert data['status'] == 'pending'


def test_short_comment_is_rejected(client: TestClient) -> None:
    ids = _ids(client)
    response = client.post(
        '/write-offs',
        json={
            **ids,
            'quantity': 1,
            'reason_code': 'OTHER',
            'deduction_type': 'NO_DEDUCTION',
            'comment': 'мало',
        },
    )
    assert response.status_code == 400


def test_with_deduction_requires_charged_employee(client: TestClient) -> None:
    ids = _ids(client)
    response = client.post(
        '/write-offs',
        json={
            **ids,
            'quantity': 1,
            'reason_code': 'DROPPED',
            'deduction_type': 'WITH_DEDUCTION',
            'comment': 'Уронили на пол при сборке',
        },
    )
    assert response.status_code == 400


def test_create_writes_audit_event(client: TestClient) -> None:
    ids = _ids(client)
    client.post(
        '/write-offs',
        json={
            **ids,
            'quantity': 2,
            'reason_code': 'EXPIRED',
            'deduction_type': 'NO_DEDUCTION',
            'comment': 'Истёк срок годности продукта',
        },
    )

    events = client.get('/audit/events').json()['data']
    assert any(e['action'] == 'created' and e['entity_type'] == 'write_off_request' for e in events)
