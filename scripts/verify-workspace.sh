#!/usr/bin/env bash
# Verifies the host is ready to build and run ui-observer.
set -uo pipefail

EXPECTED_DIR="${UI_OBSERVER_HOME:-$HOME/Projects/ui-observer}"
fail=0

check() {
  local label="$1" ok="$2" detail="${3:-}"
  if [[ "$ok" == "0" ]]; then
    printf 'ok    %s %s\n' "$label" "$detail"
  else
    printf 'FAIL  %s %s\n' "$label" "$detail"
    fail=1
  fi
}

[[ "$(pwd)" == "$EXPECTED_DIR" ]]; check "workspace" $? "(expected $EXPECTED_DIR, got $(pwd))"
[[ -d .git ]]; check "git repository" $?
command -v docker >/dev/null 2>&1; check "docker installed" $?
docker info >/dev/null 2>&1; check "docker daemon reachable" $?
docker compose version >/dev/null 2>&1; check "docker compose v2" $?
command -v node >/dev/null 2>&1 && [[ "$(node -e 'console.log(process.versions.node.split(".")[0])')" -ge 22 ]]
check "node >= 22" $?

port="${UI_OBSERVER_NOVNC_PORT:-6080}"
if command -v ss >/dev/null 2>&1 && ss -tln "sport = :$port" 2>/dev/null | grep -q ":$port"; then
  if docker compose ps --format '{{.Name}}' 2>/dev/null | grep -q 'ui-observer'; then
    check "port $port" 0 "(in use by this project's running observer)"
  else
    check "port $port free" 1 "(something else is already listening)"
  fi
else
  check "port $port free" 0
fi

if command -v getenforce >/dev/null 2>&1 && [[ "$(getenforce)" == "Enforcing" ]]; then
  echo "note  SELinux is Enforcing: compose bind mounts use :z labels (see docs/fedora.md)"
fi

exit $fail
