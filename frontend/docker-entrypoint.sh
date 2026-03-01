#!/bin/sh
set -e

# Substitute environment variables in nginx config
export BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

# Extract IPv4 DNS resolver from /etc/resolv.conf (skip IPv6 — nginx can't use them with ipv6=off)
export DNS_RESOLVER=$(grep '^nameserver' /etc/resolv.conf | awk '{print $2}' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
if [ -z "$DNS_RESOLVER" ]; then
    export DNS_RESOLVER="8.8.8.8"
fi

# Use envsubst to replace variables in nginx config
envsubst '${BACKEND_URL} ${DNS_RESOLVER}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

echo "Nginx configured: BACKEND_URL=${BACKEND_URL}, DNS_RESOLVER=${DNS_RESOLVER}"

# Test nginx config before starting
nginx -t 2>&1 || echo "WARNING: nginx config test failed"

exec "$@"
