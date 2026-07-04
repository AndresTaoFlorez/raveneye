#!/usr/bin/env bash
# Starts the observer stack and waits until it reports healthy.
set -euo pipefail

docker compose up -d
api="http://127.0.0.1:${UI_OBSERVER_API_PORT:-8090}"
echo -n "waiting for observer health"
for _ in $(seq 1 30); do
  if curl -fsS "$api/health" >/dev/null 2>&1; then
    echo " — healthy"
    echo "watch the browser at: http://127.0.0.1:${UI_OBSERVER_NOVNC_PORT:-6080}"
    exit 0
  fi
  echo -n "."
  sleep 2
done
echo " — observer did not become healthy in time" >&2
docker compose logs --tail=50 ui-observer >&2
exit 1
