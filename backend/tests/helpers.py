from __future__ import annotations

import base64
from datetime import UTC, datetime


def sample_image_base64() -> str:
    png = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    )
    return base64.b64encode(png).decode('ascii')


def now_iso() -> str:
    return datetime.now(UTC).isoformat()
