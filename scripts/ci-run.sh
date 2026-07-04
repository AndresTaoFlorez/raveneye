#!/usr/bin/env bash
# CI mode: runs a mission headless in a one-off container.
# - no ports are published (docker compose run does not map service ports)
# - noVNC/x11/supervisord never start (direct node entrypoint)
# - ephemeral context only; exit code = mission result
set -euo pipefail

mission="${1:?usage: ci-run.sh <mission-name>}"
commit="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

docker compose run --rm --no-TTY \
  -e RAVENEYE_HEADLESS=true \
  -e RAVENEYE_GIT_COMMIT="$commit" \
  --entrypoint node \
  raveneye \
  /app/apps/mission-runner/dist/cli.js run "/config/missions/${mission%.yaml}.yaml"
