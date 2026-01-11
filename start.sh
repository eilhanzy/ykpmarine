#!/bin/sh
set -e

API_PORT="${API_PORT:-3001}"
export PORT="$API_PORT"

node server/src/server.js &
nginx -g 'daemon off;'
