#!/usr/bin/env bash
# Clears the persistent browser profile volume (logins, cookies, storage).
set -euo pipefail

echo "stopping observer..."
docker compose stop raveneye >/dev/null
echo "clearing /browser-profile volume..."
docker compose run --rm --no-deps --entrypoint bash raveneye \
  -c 'rm -rf /browser-profile/* /browser-profile/.[!.]* 2>/dev/null || true; ls -la /browser-profile'
echo "restarting observer..."
docker compose up -d raveneye >/dev/null
echo "profile reset complete"
