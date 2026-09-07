FROM python:3.11-slim@sha256:9534e5a8e315485d4061ed659af0fd78a284c015f9b73661b41d6bab25604534

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY src/backend/pyproject.toml /app/backend/pyproject.toml
RUN pip install --upgrade pip setuptools wheel
RUN mkdir -p /app/backend/src/studyai \
    && touch /app/backend/src/studyai/__init__.py \
    && pip install -e .

COPY src/backend/alembic.ini /app/backend/alembic.ini
COPY src/backend/alembic /app/backend/alembic
COPY src/backend/src /app/backend/src

EXPOSE 8000

