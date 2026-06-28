from __future__ import annotations

import json

import httpx

from bahandi_backend.photos.ai import OpenAiPhotoAnalyzer, RuleBasedPhotoAnalyzer
from bahandi_backend.services.photo_service import build_analyzer
from bahandi_backend.settings import Settings


async def test_openai_analyzer_parses_json_verdict() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == '/v1/chat/completions'
        assert request.headers['Authorization'] == 'Bearer sk-test'
        verdict = {
            'is_food_waste': True,
            'detected_product': 'Говяжья котлета',
            'confidence': 0.91,
            'condition': 'Пережарена',
            'suggested_reason': 'OVERCOOKED',
            'fraud_warnings': [],
            'reviewer_note': 'Списание обосновано',
        }
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(verdict)}}]})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url='https://api.openai.com')
    analyzer = OpenAiPhotoAnalyzer(api_key='sk-test', model='gpt-4o-mini', client=client)

    result = await analyzer.analyze(content=b'img', content_type='image/png')

    assert result['provider'] == 'openai'
    assert result['status'] == 'completed'
    assert result['detected_product'] == 'Говяжья котлета'
    assert result['suggested_reason'] == 'OVERCOOKED'


async def test_openai_analyzer_reports_failure_gracefully() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text='boom')

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url='https://api.openai.com')
    analyzer = OpenAiPhotoAnalyzer(api_key='sk-test', model='gpt-4o-mini', client=client)

    result = await analyzer.analyze(content=b'img', content_type='image/png')

    assert result['provider'] == 'openai'
    assert result['status'] == 'failed'


def test_build_analyzer_prefers_openai_then_anthropic_then_fallback() -> None:
    assert isinstance(build_analyzer(Settings()), RuleBasedPhotoAnalyzer)
    assert build_analyzer(Settings(openai_api_key='sk-x')).__class__.__name__ == 'OpenAiPhotoAnalyzer'
    assert (
        build_analyzer(Settings(anthropic_api_key='ak-x')).__class__.__name__
        == 'AnthropicPhotoAnalyzer'
    )
