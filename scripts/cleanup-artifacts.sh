#!/usr/bin/env bash
# Removes mission runs older than the retention window.
set -euo pipefail

days="${UI_OBSERVER_ARTIFACT_RETENTION_DAYS:-}"
if [[ -z "$days" && -f .env ]]; then
  days="$(grep -E '^UI_OBSERVER_ARTIFACT_RETENTION_DAYS=' .env | cut -d= -f2 || true)"
fi
days="${days:-14}"

if [[ ! -d artifacts/runs ]]; then
  echo "no artifacts/runs directory; nothing to do"
  exit 0
fi

echo "removing runs older than $days day(s)..."
found=0
while IFS= read -r -d '' dir; do
  echo "  removing $dir"
  rm -rf "$dir"
  found=1
done < <(find artifacts/runs -mindepth 1 -maxdepth 1 -type d -mtime "+$days" -print0)
[[ $found -eq 0 ]] && echo "  nothing old enough to remove"
echo "done"
