from __future__ import annotations

from typing import Any

from litestar import Litestar, Request, Response
from litestar.config.cors import CORSConfig

from .api import DEPENDENCIES, ROUTE_HANDLERS
from .db.base import Base
from .db.seed import seed_demo_data
from .db.session import create_engine
from .services.errors import ServiceError
from .settings import Settings

from sqlalchemy.ext.asyncio import async_sessionmaker


async def _on_startup(app: Litestar) -> None:
    engine = app.state.engine
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = app.state.session_factory
    async with factory() as session:
        await seed_demo_data(session)
        await session.commit()


async def _on_shutdown(app: Litestar) -> None:
    engine = app.state.get('engine')
    if engine is not None:
        await engine.dispose()


def service_error_handler(_: Request, exc: ServiceError) -> Response[dict[str, Any]]:
    return Response(content={'success': False, 'error': exc.code}, status_code=exc.status_code)


def create_app(settings: Settings | None = None) -> Litestar:
    settings = settings or Settings()
    engine = create_engine(settings.database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    cors = CORSConfig(allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

    app = Litestar(
        route_handlers=ROUTE_HANDLERS,
        dependencies=DEPENDENCIES,
        cors_config=cors,
        on_startup=[_on_startup],
        on_shutdown=[_on_shutdown],
        exception_handlers={ServiceError: service_error_handler},
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    return app


app = create_app()
