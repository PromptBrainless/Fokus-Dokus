#!/bin/sh
set -e
if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
cd "$(dirname "$0")"
npm run dev > /tmp/dev-server.log 2>&1 &
