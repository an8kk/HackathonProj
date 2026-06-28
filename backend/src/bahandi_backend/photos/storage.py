from __future__ import annotations

import asyncio
from datetime import datetime

from ..settings import Settings


class PhotoStorage:
    """S3 / MinIO-compatible object storage for photo evidence.

    S3 is the only supported backend. boto3 is synchronous, so every call runs
    in a worker thread to avoid blocking the event loop. Images are served back
    to clients through the backend's ``/media/{key}`` proxy (works with private
    buckets, no presigning or CORS needed).
    """

    def __init__(self, settings: Settings) -> None:
        if not settings.s3_bucket:
            raise ValueError('S3_BUCKET must be configured')
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
        safe_suffix = suffix if suffix.startswith('.') else f'.{suffix}'
        return f'photos/{outlet_id}/{uploaded_at:%Y-%m-%d}/{photo_id}{safe_suffix}'

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
        return f'/media/{storage_key}'


def build_storage(settings: Settings) -> PhotoStorage:
    return PhotoStorage(settings)
