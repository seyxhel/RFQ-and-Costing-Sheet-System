#!/bin/sh
set -e

# Substitute environment variables in nginx config
export BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

# Use Docker/Railway embedded DNS resolver for internal service discovery
# 127.0.0.11 is Docker's built-in DNS that resolves both internal names
# (e.g. *.railway.internal) and external names
export DNS_RESOLVER="127.0.0.11"

# Use envsubst to replace variables in nginx config
envsubst '${BACKEND_URL} ${DNS_RESOLVER}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

echo "Nginx configured: BACKEND_URL=${BACKEND_URL}, DNS_RESOLVER=${DNS_RESOLVER}"

# Test nginx config before starting
nginx -t 2>&1 || echo "WARNING: nginx config test failed"

exec "$@"
