from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    backend_port: int = 4000
    database_url: str = 'sqlite+aiosqlite:///./bahandi.db'
    storage_dir: Path = Path('storage')
    jwt_secret: str = 'dev-insecure-secret-change-me'
    jwt_ttl_seconds: int = 60 * 60 * 12
    qr_base_url: str = 'https://app.qamqor.kz/qr'

    # AI (Anthropic messages API over httpx)
    anthropic_api_key: str | None = None
    anthropic_model: str = 'claude-3-5-sonnet-latest'

    # iikoWeb Public API (cloud reference/sales/KPI)
    iiko_web_base_url: str = 'https://demo-pro.iikoweb.co.uk'
    iiko_web_login: str | None = None
    iiko_web_password: str | None = None
    iiko_web_store_id: int | None = None

    # iiko Server API (on-prem write-off act creation)
    iiko_server_base_url: str | None = None
    iiko_server_login: str | None = None
    iiko_server_password_sha1: str | None = None
    iiko_server_store_id: str | None = None
    iiko_server_account_id: str | None = None

    @field_validator(
        'anthropic_api_key',
        'iiko_web_login',
        'iiko_web_password',
        'iiko_web_store_id',
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
    def iiko_web_configured(self) -> bool:
        return bool(self.iiko_web_login and self.iiko_web_password)

    @property
    def iiko_server_configured(self) -> bool:
        return bool(
            self.iiko_server_base_url
            and self.iiko_server_login
            and self.iiko_server_password_sha1
            and self.iiko_server_store_id
        )
