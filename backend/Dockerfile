FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=10

WORKDIR /app

COPY backend/pyproject.toml backend/alembic.ini ./
COPY backend/src ./src
COPY backend/migrations ./migrations

RUN pip install --no-cache-dir -e .

EXPOSE 4000

CMD ["litestar", "--app", "bahandi_backend.app:app", "run", "--host", "0.0.0.0", "--port", "4000"]
