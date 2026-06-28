from __future__ import annotations

import base64
import json
from typing import Any, Protocol

import httpx


class PhotoAnalyzer(Protocol):
    async def analyze(self, *, content: bytes, content_type: str) -> dict[str, Any]: ...


class RuleBasedPhotoAnalyzer:
    """Deterministic fallback used when no Anthropic key is configured.

    It never fabricates a confident verdict; it returns a low-confidence,
    explicitly-degraded result so reviewers know AI did not actually run.
    """

    async def analyze(self, *, content: bytes, content_type: str) -> dict[str, Any]:
        return {
            'provider': 'rule_based_fallback',
            'is_food_waste': bool(content),
            'detected_product': None,
            'confidence': 0.0,
            'condition': 'AI analysis not configured; manual review required.',
            'suggested_reason': None,
            'fraud_warnings': [] if content else ['empty_image_payload'],
            'reviewer_note': 'Set ANTHROPIC_API_KEY to enable automated photo analysis.',
            'status': 'skipped',
        }


class AnthropicPhotoAnalyzer:
    """Calls the Anthropic Messages API over httpx to analyze waste photos."""

    _PROMPT = (
        'You are a food-waste write-off reviewer for fast-food outlets. '
        'Look at the photo and respond ONLY with a JSON object with keys: '
        'is_food_waste (bool), detected_product (string|null), confidence (0..1 number), '
        'condition (short string), suggested_reason '
        '(one of DAMAGED, EXPIRED, OVERCOOKED, RAW_WASTE, DROPPED, OTHER, or null), '
        'fraud_warnings (array of short strings), reviewer_note (short string).'
    )

    def __init__(self, *, api_key: str, model: str, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key
        self._model = model
        self._client = client

    async def analyze(self, *, content: bytes, content_type: str) -> dict[str, Any]:
        payload = {
            'model': self._model,
            'max_tokens': 512,
            'messages': [
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'image',
                            'source': {
                                'type': 'base64',
                                'media_type': content_type,
                                'data': base64.b64encode(content).decode('ascii'),
                            },
                        },
                        {'type': 'text', 'text': self._PROMPT},
                    ],
                }
            ],
        }
        headers = {
            'x-api-key': self._api_key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        }

        client = self._client or httpx.AsyncClient(base_url='https://api.anthropic.com', timeout=30)
        try:
            response = await client.post('/v1/messages', json=payload, headers=headers)
            response.raise_for_status()
            body = response.json()
            text = ''.join(
                block.get('text', '') for block in body.get('content', []) if block.get('type') == 'text'
            )
            parsed = json.loads(text)
            parsed['provider'] = 'anthropic'
            parsed['status'] = 'completed'
            return parsed
        except (httpx.HTTPError, json.JSONDecodeError, KeyError) as error:
            return {
                'provider': 'anthropic',
                'status': 'failed',
                'error': str(error),
                'is_food_waste': None,
                'detected_product': None,
                'confidence': 0.0,
                'fraud_warnings': [],
                'reviewer_note': 'AI analysis failed; manual review required.',
            }
        finally:
            if self._client is None:
                await client.aclose()
