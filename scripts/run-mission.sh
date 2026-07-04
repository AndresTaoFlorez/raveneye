#!/usr/bin/env bash
# Runs a mission inside the observer container (where the display, browser
# and artifact mount live). Usage: scripts/run-mission.sh <name|path> [extra flags]
set -euo pipefail

mission="${1:?usage: run-mission.sh <mission-name|/path/in/container.yaml> [flags]}"
shift || true

if [[ "$mission" != /* ]]; then
  mission="/config/missions/${mission%.yaml}.yaml"
fi

commit="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

code=0
docker compose exec \
  -e UI_OBSERVER_GIT_COMMIT="$commit" \
  ui-observer \
  node /app/apps/mission-runner/dist/cli.js run "$mission" "$@" || code=$?
echo "exit code: $code (0 pass, 1 findings, 2 mission error, 3 browser error)"
exit $code
