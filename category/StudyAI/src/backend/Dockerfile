FROM python:3.11-slim

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
COPY src/backend/alembic.ini /app/backend/alembic.ini
COPY src/backend/alembic /app/backend/alembic
COPY src/backend/src /app/backend/src

RUN pip install --upgrade pip setuptools wheel
RUN pip install -e .

EXPOSE 8000

