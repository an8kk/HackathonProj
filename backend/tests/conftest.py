from __future__ import annotations

from collections.abc import Iterator

import pytest
from litestar.testing import TestClient

from bahandi_backend.app import create_app
from bahandi_backend.settings import Settings
from helpers import token_for


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        database_url=f'sqlite+aiosqlite:///{tmp_path}/test.db',
        storage_dir=tmp_path / 'storage',
        jwt_secret='test-secret-key-at-least-32-bytes-long',
    )

@pytest.fixture
def raw_client(settings: Settings) -> Iterator[TestClient]:
    """Unauthenticated client (no default bearer token)."""
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    """Owner-authenticated client used by the majority of tests."""
    with TestClient(create_app(settings)) as test_client:
        test_client.headers['Authorization'] = f'Bearer {token_for(test_client, "9999")}'
        yield test_client
