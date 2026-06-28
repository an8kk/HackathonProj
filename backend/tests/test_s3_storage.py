from __future__ import annotations

from datetime import UTC, datetime

import boto3
import pytest
from moto import mock_aws

from bahandi_backend.photos.storage import LocalPhotoStorage, S3PhotoStorage, build_storage
from bahandi_backend.settings import Settings


def _s3_settings() -> Settings:
    return Settings(
        storage_backend='s3',
        s3_bucket='bahandi-photos',
        s3_region='us-east-1',
        s3_access_key_id='test',
        s3_secret_access_key='test',
    )


def test_build_storage_selects_backend(tmp_path) -> None:
    local = build_storage(Settings(storage_backend='local', storage_dir=tmp_path))
    assert isinstance(local, LocalPhotoStorage)
    assert isinstance(build_storage(_s3_settings()), S3PhotoStorage)


async def test_local_storage_round_trip(tmp_path) -> None:
    storage = LocalPhotoStorage(tmp_path)
    key = storage.build_key(
        outlet_id='outlet-1', photo_id='p1', uploaded_at=datetime.now(UTC), suffix='.png'
    )
    url = await storage.write(key, b'bytes', content_type='image/png')

    assert await storage.read(key) == b'bytes'
    assert url.endswith(key)


@mock_aws
def test_s3_storage_round_trip() -> None:
    import asyncio

    settings = _s3_settings()
    boto3.client('s3', region_name='us-east-1').create_bucket(Bucket=settings.s3_bucket)
    storage = S3PhotoStorage(settings)

    key = storage.build_key(
        outlet_id='outlet-1', photo_id='p1', uploaded_at=datetime.now(UTC), suffix='.jpg'
    )
    url = asyncio.run(storage.write(key, b'jpeg-bytes', content_type='image/jpeg'))
    body = asyncio.run(storage.read(key))

    assert body == b'jpeg-bytes'
    assert settings.s3_bucket in url

    # object actually exists in the (mocked) bucket
    listed = boto3.client('s3', region_name='us-east-1').list_objects_v2(Bucket=settings.s3_bucket)
    assert listed['KeyCount'] == 1


def test_s3_storage_requires_bucket() -> None:
    with pytest.raises(ValueError):
        S3PhotoStorage(Settings(storage_backend='s3'))
