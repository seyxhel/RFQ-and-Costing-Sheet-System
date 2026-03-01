#!/bin/sh
set -e

# Substitute environment variables in nginx config
export BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

# Use envsubst to replace ${BACKEND_URL} in nginx config
envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

echo "Nginx configured with BACKEND_URL=${BACKEND_URL}"

# Test nginx config before starting (don't crash-loop)
nginx -t 2>&1 || echo "WARNING: nginx config test failed, starting anyway..."

exec "$@"
