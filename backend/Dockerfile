FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/pyproject.toml ./
COPY backend/src ./src

RUN pip install --no-cache-dir -e .

EXPOSE 4000

CMD ["litestar", "--app", "bahandi_backend.app:app", "run", "--host", "0.0.0.0", "--port", "4000"]
