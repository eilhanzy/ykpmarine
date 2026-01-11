#!/bin/sh
set -e

API_PORT="${API_PORT:-3001}"
export PORT="$API_PORT"

mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi

node server/src/server.js &
nginx -g 'daemon off;'
