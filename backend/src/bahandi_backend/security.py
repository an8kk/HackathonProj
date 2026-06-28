from __future__ import annotations

import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt


def hash_pin(pin: str, *, salt: str | None = None) -> str:
    salt = salt or os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac('sha256', pin.encode(), bytes.fromhex(salt), 120_000)
    return f'{salt}${digest.hex()}'


def verify_pin(pin: str, stored: str) -> bool:
    try:
        salt, _ = stored.split('$', 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_pin(pin, salt=salt), stored)


def create_access_token(*, secret: str, subject: str, role: str, ttl_seconds: int) -> str:
    now = datetime.now(UTC)
    payload = {
        'sub': subject,
        'role': role,
        'iat': int(now.timestamp()),
        'exp': int((now + timedelta(seconds=ttl_seconds)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm='HS256')


def decode_access_token(*, secret: str, token: str) -> dict[str, Any]:
    return jwt.decode(token, secret, algorithms=['HS256'])
