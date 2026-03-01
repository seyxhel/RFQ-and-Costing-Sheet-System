#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Creating default admin (if configured)..."
python manage.py create_default_admin || true

echo "Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo "Starting Gunicorn on port ${PORT:-8000}..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${GUNICORN_WORKERS:-3} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
