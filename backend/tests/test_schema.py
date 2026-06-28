from __future__ import annotations

import bahandi_backend.db.models  # noqa: F401
from bahandi_backend.db.base import Base
from bahandi_backend.db.session import normalize_database_url


def test_initial_schema_contains_core_tables() -> None:
    expected = {
        'outlets',
        'employees',
        'products',
        'waste_norms',
        'photos',
        'write_off_requests',
        'inventory_movements',
        'inventory_counts',
        'inventory_count_lines',
        'qr_tokens',
        'audit_events',
        'iiko_sync_jobs',
    }
    assert expected.issubset(set(Base.metadata.tables))


def test_postgres_url_is_normalized_to_asyncpg() -> None:
    assert normalize_database_url('postgres://u:p@h:5432/db') == 'postgresql+asyncpg://u:p@h:5432/db'
    assert normalize_database_url('postgresql://u:p@h/db') == 'postgresql+asyncpg://u:p@h/db'
