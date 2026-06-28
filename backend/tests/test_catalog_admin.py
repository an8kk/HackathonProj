from __future__ import annotations

from litestar.testing import TestClient


def test_seeded_reference_data_is_available(client: TestClient) -> None:
    assert len(client.get('/outlets').json()['data']) == 2
    assert len(client.get('/products').json()['data']) == 4
    assert len(client.get('/employees').json()['data']) == 4


def test_employees_can_be_filtered_by_outlet(client: TestClient) -> None:
    outlet_id = client.get('/outlets').json()['data'][0]['id']

    response = client.get('/employees', params={'outlet_id': outlet_id})

    employees = response.json()['data']
    assert employees
    assert all(e['outlet_id'] == outlet_id for e in employees)


def test_admin_can_create_product_with_norm(client: TestClient) -> None:
    created = client.post(
        '/admin/products',
        json={'name': 'Соус барбекю', 'unit': 'граммы', 'cost_per_unit': 3.2, 'norm_waste_pct': 4.0},
    )
    assert created.status_code == 201
    product_id = created.json()['data']['id']

    norms = client.get('/norms', params={'product_id': product_id}).json()['data']
    assert len(norms) == 1
    assert norms[0]['max_waste_pct'] == 4.0


def test_admin_can_create_outlet_and_employee(client: TestClient) -> None:
    outlet = client.post('/admin/outlets', json={'name': 'Khan Shatyr', 'address': 'Астана'})
    assert outlet.status_code == 201
    outlet_id = outlet.json()['data']['id']

    employee = client.post(
        '/admin/employees',
        json={'outlet_id': outlet_id, 'name': 'Тест Тестов', 'role': 'sender', 'pin': '4444'},
    )
    assert employee.status_code == 201

    login = client.post('/auth/login', json={'pin': '4444'})
    assert login.status_code == 200
