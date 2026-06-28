from __future__ import annotations

import base64
import hashlib
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import models
from ..photos.ai import AnthropicPhotoAnalyzer, PhotoAnalyzer, RuleBasedPhotoAnalyzer
from ..photos.metadata import validate_metadata
from ..photos.storage import PhotoStorage
from ..schemas import PhotoUploadRequest
from ..settings import Settings


def build_analyzer(settings: Settings) -> PhotoAnalyzer:
    if settings.anthropic_api_key:
        return AnthropicPhotoAnalyzer(
            api_key=settings.anthropic_api_key, model=settings.anthropic_model
        )
    return RuleBasedPhotoAnalyzer()


def build_storage(settings: Settings) -> PhotoStorage:
    return PhotoStorage(Path(settings.storage_dir))


async def save_photo(
    session: AsyncSession,
    data: PhotoUploadRequest,
    *,
    settings: Settings,
    analyzer: PhotoAnalyzer,
    storage: PhotoStorage,
    outlet_id: str = 'unknown',
) -> models.Photo:
    content = base64.b64decode(data.content_base64)
    uploaded_at = datetime.now(UTC)

    sha = hashlib.sha256(content).hexdigest()
    existing = await session.execute(
        select(models.Photo).where(models.Photo.sha256_hash == sha)
    )
    is_duplicate = existing.scalars().first() is not None

    metadata = validate_metadata(
        content=content,
        content_type=data.content_type,
        taken_at=data.taken_at,
        uploaded_at=uploaded_at,
        is_duplicate=is_duplicate,
    )

    photo = models.Photo(
        filename=data.filename,
        storage_key='',
        content_type=data.content_type,
        sha256_hash=metadata.sha256_hash,
        perceptual_hash=metadata.perceptual_hash,
        taken_at=data.taken_at,
        uploaded_at=uploaded_at,
        metadata_status=metadata.status,
        validation_errors=metadata.errors,
        ai_analysis={},
    )
    session.add(photo)
    await session.flush()

    suffix = Path(data.filename).suffix or '.jpg'
    storage_key = storage.build_key(
        outlet_id=outlet_id, photo_id=photo.id, uploaded_at=uploaded_at, suffix=suffix
    )
    storage.write(storage_key, content)
    photo.storage_key = storage_key
    photo.ai_analysis = await analyzer.analyze(content=content, content_type=data.content_type)
    await session.flush()
    return photo
