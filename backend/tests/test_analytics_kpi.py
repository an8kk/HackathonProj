from __future__ import annotations

from litestar.testing import TestClient


def _approved_request(client: TestClient, reason: str = 'OVERCOOKED') -> None:
    employee = client.post('/auth/login', json={'pin': '1111'}).json()['data']
    product = client.get('/products').json()['data'][0]
    created = client.post(
        '/write-offs',
        json={
            'outlet_id': employee['outlet']['id'],
            'employee_id': employee['id'],
            'product_id': product['id'],
            'quantity': 2,
            'unit': product['unit'],
            'reason_code': reason,
            'deduction_type': 'NO_DEDUCTION',
            'comment': 'Стандартное списание для аналитики',
        },
    ).json()['data']
    client.patch(
        f'/write-offs/{created["id"]}/review',
        json={'reviewer_id': 'employee-reviewer-1', 'decision': 'approved'},
    )


def test_summary_counts_requests(client: TestClient) -> None:
    _approved_request(client)
    summary = client.get('/analytics/summary').json()['data']
    assert summary['total_requests'] == 1
    assert summary['approved'] == 1
    assert summary['approved_cost_value'] > 0


def test_employee_analytics_ranks_reporters(client: TestClient) -> None:
    _approved_request(client)
    rows = client.get('/analytics/employees').json()['data']
    top = next(r for r in rows if r['employee_id'] == 'employee-sender-1')
    assert top['approved'] == 1


def test_investigations_flag_repeated_clusters(client: TestClient) -> None:
    for _ in range(3):
        _approved_request(client, reason='RAW_WASTE')

    findings = client.get('/analytics/investigations').json()['data']
    assert any(f['occurrences'] >= 3 for f in findings)


def test_kpi_outlets_returns_scores(client: TestClient) -> None:
    _approved_request(client)
    rows = client.get('/kpi/outlets').json()['data']
    assert rows
    assert all(0 <= row['score'] <= 100 for row in rows)
