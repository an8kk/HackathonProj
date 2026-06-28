from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from io import BytesIO

from PIL import Image, UnidentifiedImageError

from ..domain.enums import MetadataStatus

SUPPORTED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
FUTURE_TOLERANCE = timedelta(minutes=5)
MAX_AGE = timedelta(days=1)


@dataclass
class PhotoMetadata:
    sha256_hash: str
    perceptual_hash: str | None
    status: MetadataStatus
    errors: list[str] = field(default_factory=list)


def average_hash(content: bytes) -> str | None:
    """Compute a dependency-light 64-bit average hash (aHash) of the image."""
    try:
        with Image.open(BytesIO(content)) as image:
            grayscale = image.convert('L').resize((8, 8))
    except (UnidentifiedImageError, OSError):
        return None

    pixels = list(grayscale.getdata())
    mean = sum(pixels) / len(pixels)
    bits = ''.join('1' if pixel >= mean else '0' for pixel in pixels)
    return f'{int(bits, 2):016x}'


def validate_metadata(
    *,
    content: bytes,
    content_type: str,
    taken_at: datetime | None,
    uploaded_at: datetime,
    is_duplicate: bool,
) -> PhotoMetadata:
    sha256_hash = hashlib.sha256(content).hexdigest()
    perceptual_hash = average_hash(content)
    errors: list[str] = []

    if content_type not in SUPPORTED_CONTENT_TYPES:
        errors.append('unsupported_content_type')
    if perceptual_hash is None:
        errors.append('unreadable_image')
    if is_duplicate:
        errors.append('duplicate_photo_hash')

    if taken_at is None:
        errors.append('missing_taken_at')
    else:
        taken_at_utc = taken_at if taken_at.tzinfo else taken_at.replace(tzinfo=UTC)
        if taken_at_utc > uploaded_at + FUTURE_TOLERANCE:
            errors.append('taken_at_is_in_future')
        elif uploaded_at - taken_at_utc > MAX_AGE:
            errors.append('taken_at_too_old')

    hard_failures = {
        'unsupported_content_type',
        'unreadable_image',
        'taken_at_is_in_future',
        'duplicate_photo_hash',
    }
    if hard_failures.intersection(errors):
        status = MetadataStatus.INVALID
    elif errors:
        status = MetadataStatus.WARNING
    else:
        status = MetadataStatus.VALID

    return PhotoMetadata(
        sha256_hash=sha256_hash,
        perceptual_hash=perceptual_hash,
        status=status,
        errors=errors,
    )
