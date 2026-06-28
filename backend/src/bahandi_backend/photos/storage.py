from __future__ import annotations

from datetime import datetime
from pathlib import Path


class PhotoStorage:
    """Local filesystem object storage for photo evidence.

    The interface is intentionally narrow so it can be swapped for an
    S3/MinIO adapter without touching the photo service.
    """

    def __init__(self, base_dir: Path) -> None:
        self._base_dir = base_dir

    def build_key(self, *, outlet_id: str, photo_id: str, uploaded_at: datetime, suffix: str) -> str:
        safe_suffix = suffix if suffix.startswith('.') else f'.{suffix}'
        return f'photos/{outlet_id}/{uploaded_at:%Y-%m-%d}/{photo_id}{safe_suffix}'

    def write(self, storage_key: str, content: bytes) -> Path:
        path = self._base_dir / storage_key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def read(self, storage_key: str) -> bytes:
        return (self._base_dir / storage_key).read_bytes()
