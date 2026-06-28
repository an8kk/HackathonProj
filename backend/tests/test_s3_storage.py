from __future__ import annotations

from datetime import UTC, datetime

import boto3
import pytest

from bahandi_backend.photos.storage import PhotoStorage, build_storage
from bahandi_backend.settings import Settings


def _settings() -> Settings:
    return Settings(
        s3_bucket='test-bucket',
        s3_region='us-east-1',
        s3_access_key_id='test',
        s3_secret_access_key='test',
    )


def test_build_storage_returns_s3_backend() -> None:
    assert isinstance(build_storage(_settings()), PhotoStorage)


def test_storage_requires_bucket() -> None:
    with pytest.raises(ValueError):
        PhotoStorage(Settings(s3_bucket=''))


async def test_s3_round_trip_and_proxy_url() -> None:
    storage = PhotoStorage(_settings())
    key = storage.build_key(
        outlet_id='outlet-1', photo_id='p1', uploaded_at=datetime.now(UTC), suffix='.jpg'
    )

    url = await storage.write(key, b'jpeg-bytes', content_type='image/jpeg')
    body = await storage.read(key)

    assert body == b'jpeg-bytes'
    assert url == f'/media/{key}'

    listed = boto3.client('s3', region_name='us-east-1').list_objects_v2(Bucket='test-bucket')
    assert listed['KeyCount'] == 1
