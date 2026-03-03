#!/bin/bash
set -e

echo "Running migrations..."
if ! python manage.py migrate --noinput 2>&1; then
    echo ""
    echo "==> Standard migration failed. Resetting DB schema for fresh start..."
    python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('''
        DO \$\$ DECLARE r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END \$\$;
    ''')
print('All tables dropped — re-running migrations from scratch.')
"
    python manage.py migrate --noinput
fi

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
