from __future__ import annotations

from collections.abc import Iterator

import pytest
from litestar.testing import TestClient

from bahandi_backend.app import create_app
from bahandi_backend.settings import Settings


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        database_url=f'sqlite+aiosqlite:///{tmp_path}/test.db',
        storage_dir=tmp_path / 'storage',
        jwt_secret='test-secret',
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as test_client:
        yield test_client
