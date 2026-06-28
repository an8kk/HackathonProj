from __future__ import annotations

from collections.abc import Iterator

import boto3
import pytest
from litestar.testing import TestClient
from moto import mock_aws

from bahandi_backend.app import create_app
from bahandi_backend.settings import Settings
from helpers import token_for

_TEST_BUCKET = 'test-bucket'
_TEST_REGION = 'us-east-1'


@pytest.fixture(autouse=True)
def mock_s3() -> Iterator[None]:
    """All tests run against an in-memory S3 (moto) — S3 is the only backend."""
    with mock_aws():
        boto3.client('s3', region_name=_TEST_REGION).create_bucket(Bucket=_TEST_BUCKET)
        yield


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        database_url=f'sqlite+aiosqlite:///{tmp_path}/test.db',
        jwt_secret='test-secret-key-at-least-32-bytes-long',
        s3_bucket=_TEST_BUCKET,
        s3_region=_TEST_REGION,
        s3_access_key_id='test',
        s3_secret_access_key='test',
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
