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


def token_for(test_client, pin: str) -> str:
    return test_client.post('/auth/login', json={'pin': pin}).json()['data']['token']


def auth_headers(test_client, pin: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token_for(test_client, pin)}'}
