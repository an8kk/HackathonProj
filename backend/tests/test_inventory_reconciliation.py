from __future__ import annotations

from litestar.testing import TestClient


def test_supply_increases_balance(client: TestClient) -> None:
    outlet = client.get('/outlets').json()['data'][0]
    product = client.get('/products').json()['data'][0]

    before = _balance(client, outlet['id'], product['id'])
    client.post(
        '/inventory/supplies',
        json={'outlet_id': outlet['id'], 'product_id': product['id'], 'quantity': 50},
    )
    after = _balance(client, outlet['id'], product['id'])

    assert round(after - before, 3) == 50


def test_count_creates_adjustment_movement(client: TestClient) -> None:
    outlet = client.get('/outlets').json()['data'][0]
    product = client.get('/products').json()['data'][0]

    response = client.post(
        '/inventory/counts',
        json={
            'outlet_id': outlet['id'],
            'lines': [{'product_id': product['id'], 'counted_quantity': 900}],
        },
    )

    adjustments = response.json()['data']['adjustments']
    assert len(adjustments) == 1
    assert adjustments[0]['movement_type'] == 'COUNT_ADJUSTMENT'
    assert adjustments[0]['quantity'] == -100


def test_reconciliation_reports_theoretical_and_actual(client: TestClient) -> None:
    outlet = client.get('/outlets').json()['data'][0]
    rows = client.get('/inventory/reconciliation', params={'outlet_id': outlet['id']}).json()['data']

    assert rows
    for row in rows:
        assert 'theoretical_balance' in row
        assert 'actual_balance' in row
        assert 'unexplained_variance' in row


def _balance(client: TestClient, outlet_id: str, product_id: str) -> float:
    rows = client.get('/inventory/balances').json()['data']
    for row in rows:
        if row['outlet_id'] == outlet_id and row['product_id'] == product_id:
            return row['balance']
    return 0.0
