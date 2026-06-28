from __future__ import annotations

from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    backend_port: int = 4000
    database_url: str = 'sqlite+aiosqlite:///./bahandi.db'
    seed_demo_data: bool = False
    # Photo object storage: S3 / MinIO compatible (the only supported backend)
    s3_bucket: str = 'bahandi-photos'
    s3_region: str = 'us-east-1'
    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None

    jwt_secret: str = 'dev-insecure-secret-change-me'
    jwt_ttl_seconds: int = 60 * 60 * 12
    qr_base_url: str = 'https://app.qamqor.kz/qr'

    # AI photo analysis. OpenAI is preferred when set, then Anthropic, else a
    # degraded rule-based fallback. All over httpx (no SDK).
    openai_api_key: str | None = None
    openai_model: str = 'gpt-4o-mini'
    anthropic_api_key: str | None = None
    anthropic_model: str = 'claude-3-5-sonnet-latest'
    # iiko Server API (on-prem write-off act creation)
    # When no real credentials are set, IIKO_SIMULATE makes approvals report a
    # successful (simulated) write-off act — for demos where live iiko is absent.
    iiko_simulate: bool = False
    iiko_server_base_url: str | None = None
    iiko_server_login: str | None = None
    iiko_server_password_sha1: str | None = None
    iiko_server_store_id: str | None = None
    iiko_server_account_id: str | None = None

    @field_validator(
        'openai_api_key',
        'anthropic_api_key',
        'iiko_server_base_url',
        'iiko_server_login',
        'iiko_server_password_sha1',
        'iiko_server_store_id',
        'iiko_server_account_id',
        mode='before',
    )
    @classmethod
    def _empty_string_to_none(cls, value: Any) -> Any:
        if isinstance(value, str) and value.strip() == '':
            return None
        return value

    @property
    def iiko_server_configured(self) -> bool:
        return bool(
            self.iiko_server_base_url
            and self.iiko_server_login
            and self.iiko_server_password_sha1
            and self.iiko_server_store_id
        )
