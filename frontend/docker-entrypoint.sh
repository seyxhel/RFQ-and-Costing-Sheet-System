#!/bin/sh
set -e

# Substitute environment variables in nginx config
export BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

# Extract DNS resolver from the container's resolv.conf (works on Docker, Railway, etc.)
RAW_RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf 2>/dev/null || echo "8.8.8.8")
# Nginx requires IPv6 addresses to be wrapped in square brackets
case "$RAW_RESOLVER" in
    *:*) export NGINX_RESOLVER="[$RAW_RESOLVER]" ;;
    *)   export NGINX_RESOLVER="$RAW_RESOLVER" ;;
esac
echo "DNS resolver: ${NGINX_RESOLVER}"

# Use envsubst to replace variables in nginx config
# Only substitute our custom vars — leave nginx variables ($host, $uri, etc.) intact
envsubst '${BACKEND_URL} ${NGINX_RESOLVER}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

echo "Nginx configured: BACKEND_URL=${BACKEND_URL}"

# Test nginx config before starting
nginx -t 2>&1 || echo "WARNING: nginx config test failed"

exec "$@"
