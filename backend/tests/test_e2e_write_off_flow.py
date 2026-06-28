from __future__ import annotations

from datetime import UTC, datetime

from litestar.testing import TestClient

from helpers import sample_image_base64


def test_full_write_off_flow_end_to_end(client: TestClient) -> None:
    # 1. Sender logs in
    sender = client.post('/auth/login', json={'pin': '1111'}).json()['data']
    product = client.get('/products').json()['data'][0]

    # 2. Sender uploads a photo
    photo = client.post(
        '/photos',
        params={'outlet_id': sender['outlet']['id']},
        json={
            'filename': 'evidence.png',
            'content_base64': sample_image_base64(),
            'content_type': 'image/png',
            'taken_at': datetime.now(UTC).isoformat(),
        },
    ).json()['data']
    assert photo['metadata_status'] == 'valid'

    # 3. Sender creates a write-off request
    created = client.post(
        '/write-offs',
        json={
            'outlet_id': sender['outlet']['id'],
            'employee_id': sender['id'],
            'product_id': product['id'],
            'photo_id': photo['id'],
            'quantity': 4,
            'unit': product['unit'],
            'reason_code': 'OVERCOOKED',
            'deduction_type': 'NO_DEDUCTION',
            'comment': 'Сквозной сценарий end-to-end',
        },
    ).json()['data']
    assert created['status'] == 'pending'

    # 4. Reviewer logs in and approves
    reviewer = client.post('/auth/login', json={'pin': '2222'}).json()['data']
    reviewed = client.patch(
        f'/write-offs/{created["id"]}/review',
        json={'reviewer_id': reviewer['id'], 'decision': 'approved'},
    ).json()['data']
    assert reviewed['status'] == 'approved'
    assert reviewed['iiko_sync']['status'] == 'not_configured'

    # 5. Inventory movement is recorded
    movements = client.get('/inventory/movements').json()['data']
    assert any(m['source_request_id'] == created['id'] and m['quantity'] == -4 for m in movements)

    # 6. Analytics reflect the approved request
    summary = client.get('/analytics/summary').json()['data']
    assert summary['approved'] == 1

    employees = client.get('/analytics/employees').json()['data']
    assert any(e['employee_id'] == sender['id'] and e['approved'] == 1 for e in employees)

    # 7. KPI scoring is available
    kpis = client.get('/kpi/outlets').json()['data']
    assert any(row['outlet_id'] == sender['outlet']['id'] for row in kpis)
