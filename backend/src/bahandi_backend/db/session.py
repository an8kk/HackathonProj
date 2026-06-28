from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine


def normalize_database_url(database_url: str) -> str:
    """Coerce common Postgres URL forms to the asyncpg driver."""
    if database_url.startswith('postgres://'):
        return database_url.replace('postgres://', 'postgresql+asyncpg://', 1)
    if database_url.startswith('postgresql://'):
        return database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    return database_url


def create_engine(database_url: str) -> AsyncEngine:
    return create_async_engine(normalize_database_url(database_url), pool_pre_ping=True, future=True)


def create_session_factory(database_url: str) -> async_sessionmaker[AsyncSession]:
    engine = create_engine(database_url)
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
