from __future__ import annotations

from datetime import UTC, datetime, timedelta

from litestar.testing import TestClient

from helpers import sample_image_base64


def test_valid_photo_is_stored_with_hashes(client: TestClient) -> None:
    response = client.post(
        '/photos',
        json={
            'filename': 'patty.png',
            'content_base64': sample_image_base64(),
            'content_type': 'image/png',
            'taken_at': datetime.now(UTC).isoformat(),
        },
    )

    assert response.status_code == 201
    data = response.json()['data']
    assert data['metadata_status'] == 'valid'
    assert len(data['sha256_hash']) == 64
    assert data['perceptual_hash']
    assert data['ai_analysis']['provider'] == 'rule_based_fallback'


def test_future_taken_at_is_invalid(client: TestClient) -> None:
    response = client.post(
        '/photos',
        json={
            'filename': 'future.png',
            'content_base64': sample_image_base64(),
            'content_type': 'image/png',
            'taken_at': (datetime.now(UTC) + timedelta(days=1)).isoformat(),
        },
    )

    data = response.json()['data']
    assert data['metadata_status'] == 'invalid'
    assert 'taken_at_is_in_future' in data['validation_errors']


def test_missing_taken_at_is_warning(client: TestClient) -> None:
    response = client.post(
        '/photos',
        json={
            'filename': 'no-exif.png',
            'content_base64': sample_image_base64(),
            'content_type': 'image/png',
        },
    )

    data = response.json()['data']
    assert data['metadata_status'] == 'warning'
    assert 'missing_taken_at' in data['validation_errors']


def test_duplicate_photo_hash_is_flagged(client: TestClient) -> None:
    payload = {
        'filename': 'dup.png',
        'content_base64': sample_image_base64(),
        'content_type': 'image/png',
        'taken_at': datetime.now(UTC).isoformat(),
    }
    client.post('/photos', json=payload)
    second = client.post('/photos', json=payload)

    data = second.json()['data']
    assert 'duplicate_photo_hash' in data['validation_errors']
    assert data['metadata_status'] == 'invalid'


def test_photo_can_be_fetched_and_served(client: TestClient) -> None:
    created = client.post(
        '/photos',
        json={
            'filename': 'evidence.png',
            'content_base64': sample_image_base64(),
            'content_type': 'image/png',
            'taken_at': datetime.now(UTC).isoformat(),
        },
    ).json()['data']

    fetched = client.get(f'/photos/{created["id"]}')
    assert fetched.status_code == 200
    assert fetched.json()['data']['ai_analysis']

    media = client.get(f'/media/{created["storage_key"]}')
    assert media.status_code == 200
    assert media.headers['content-type'] == 'image/png'
