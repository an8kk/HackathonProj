from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config

# backend/ root holds alembic.ini and the migrations/ directory.
_BACKEND_ROOT = Path(__file__).resolve().parents[3]
_ALEMBIC_INI = _BACKEND_ROOT / 'alembic.ini'
_MIGRATIONS_DIR = _BACKEND_ROOT / 'migrations'


def to_sync_url(database_url: str) -> str:
    """Alembic uses a synchronous driver; map async URLs to sync equivalents."""
    if database_url.startswith('sqlite+aiosqlite:'):
        return database_url.replace('sqlite+aiosqlite:', 'sqlite:', 1)
    if database_url.startswith('postgresql+asyncpg:'):
        return database_url.replace('postgresql+asyncpg:', 'postgresql+psycopg:', 1)
    if database_url.startswith('postgresql:'):
        return database_url.replace('postgresql:', 'postgresql+psycopg:', 1)
    if database_url.startswith('postgres:'):
        return database_url.replace('postgres:', 'postgresql+psycopg:', 1)
    return database_url


def build_config(database_url: str) -> Config:
    config = Config(str(_ALEMBIC_INI))
    config.set_main_option('script_location', str(_MIGRATIONS_DIR))
    config.set_main_option('sqlalchemy.url', to_sync_url(database_url))
    return config


def run_migrations(database_url: str) -> None:
    """Upgrade the database to the latest revision (synchronous)."""
    command.upgrade(build_config(database_url), 'head')
