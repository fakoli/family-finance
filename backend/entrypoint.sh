#!/bin/bash
set -e

echo "Waiting for postgres..."
until python -c "
import asyncio, asyncpg, os
url = os.environ.get('DATABASE_URL', '').replace('+asyncpg', '')
asyncio.run(asyncpg.connect(url))
" 2>/dev/null; do
    echo "  Postgres not ready, retrying in 2s..."
    sleep 2
done
echo "Postgres ready."

echo "Running migrations..."
alembic upgrade head

echo "Seeding categories..."
python -m app.seed_categories

echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
