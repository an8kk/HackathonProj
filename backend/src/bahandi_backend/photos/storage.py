from __future__ import annotations

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Protocol

from ..settings import Settings


class PhotoStorage(Protocol):
    """Object storage for photo evidence.

    The interface is deliberately small so the backend can swap a local
    filesystem for S3/MinIO without touching the photo service.
    """

    def build_key(self, *, outlet_id: str, photo_id: str, uploaded_at: datetime, suffix: str) -> str: ...

    async def write(self, storage_key: str, content: bytes, *, content_type: str) -> str: ...

    async def read(self, storage_key: str) -> bytes: ...

    def url_for(self, storage_key: str) -> str: ...


def _build_key(*, outlet_id: str, photo_id: str, uploaded_at: datetime, suffix: str) -> str:
    safe_suffix = suffix if suffix.startswith('.') else f'.{suffix}'
    return f'photos/{outlet_id}/{uploaded_at:%Y-%m-%d}/{photo_id}{safe_suffix}'


class LocalPhotoStorage:
    def __init__(self, base_dir: Path, *, media_base_url: str = '/media') -> None:
        self._base_dir = base_dir
        self._media_base_url = media_base_url.rstrip('/')

    def build_key(self, *, outlet_id: str, photo_id: str, uploaded_at: datetime, suffix: str) -> str:
        return _build_key(outlet_id=outlet_id, photo_id=photo_id, uploaded_at=uploaded_at, suffix=suffix)

    async def write(self, storage_key: str, content: bytes, *, content_type: str) -> str:
        def _write() -> None:
            path = self._base_dir / storage_key
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)

        await asyncio.to_thread(_write)
        return self.url_for(storage_key)

    async def read(self, storage_key: str) -> bytes:
        return await asyncio.to_thread((self._base_dir / storage_key).read_bytes)

    def url_for(self, storage_key: str) -> str:
        return f'{self._media_base_url}/{storage_key}'


class S3PhotoStorage:
    """S3 / MinIO-compatible storage. boto3 is synchronous, so calls run in a thread."""

    def __init__(self, settings: Settings) -> None:
        if not settings.s3_bucket:
            raise ValueError('S3_BUCKET must be set for the s3 storage backend')
        self._bucket = settings.s3_bucket
        self._endpoint_url = settings.s3_endpoint_url
        self._region = settings.s3_region
        self._access_key = settings.s3_access_key_id
        self._secret_key = settings.s3_secret_access_key

    def _client(self):  # noqa: ANN202 - boto3 client is untyped
        import boto3

        return boto3.client(
            's3',
            endpoint_url=self._endpoint_url,
            region_name=self._region,
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
        )

    def build_key(self, *, outlet_id: str, photo_id: str, uploaded_at: datetime, suffix: str) -> str:
        return _build_key(outlet_id=outlet_id, photo_id=photo_id, uploaded_at=uploaded_at, suffix=suffix)

    async def write(self, storage_key: str, content: bytes, *, content_type: str) -> str:
        def _put() -> None:
            self._client().put_object(
                Bucket=self._bucket, Key=storage_key, Body=content, ContentType=content_type
            )

        await asyncio.to_thread(_put)
        return self.url_for(storage_key)

    async def read(self, storage_key: str) -> bytes:
        def _get() -> bytes:
            response = self._client().get_object(Bucket=self._bucket, Key=storage_key)
            return response['Body'].read()

        return await asyncio.to_thread(_get)

    def url_for(self, storage_key: str) -> str:
        if self._endpoint_url:
            return f'{self._endpoint_url.rstrip("/")}/{self._bucket}/{storage_key}'
        return f's3://{self._bucket}/{storage_key}'


def build_storage(settings: Settings) -> PhotoStorage:
    if settings.storage_backend == 's3':
        return S3PhotoStorage(settings)
    return LocalPhotoStorage(Path(settings.storage_dir), media_base_url=settings.media_base_url)
