#!/usr/bin/env bash
# Raveneye installer — Linux / macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.sh | bash
set -euo pipefail

INSTALL_DIR="${RAVENEYE_HOME:-$HOME/.raveneye}"
COMPOSE_URL="https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/compose.hub.yaml"
BOLD='\033[1m'; GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'

step() { echo -e "\n${BOLD}$1${RESET}"; }
ok()   { echo -e "${GREEN}✔ $1${RESET}"; }
fail() { echo -e "${RED}✘ $1${RESET}" >&2; exit 1; }

echo -e "${BOLD}━━━ Raveneye Installer ━━━${RESET}"

# ── Prerequisites ──────────────────────────────────────────────────────────────
step "Checking prerequisites"
command -v docker >/dev/null 2>&1 || fail "docker not found. Install Docker Engine: https://docs.docker.com/engine/install"
command -v node   >/dev/null 2>&1 || fail "node not found. Install Node.js 22+: https://nodejs.org"
command -v npm    >/dev/null 2>&1 || fail "npm not found (comes with Node.js)."
docker info       >/dev/null 2>&1 || fail "Docker daemon is not running. Start Docker and re-run."
NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
[[ "$NODE_MAJOR" -ge 22 ]] || fail "Node.js >= 22 required (found $NODE_MAJOR). Upgrade from https://nodejs.org."
ok "docker, node $NODE_MAJOR, npm — all present"

# ── Create install directory ───────────────────────────────────────────────────
step "Setting up $INSTALL_DIR"
mkdir -p "$INSTALL_DIR/artifacts"
ok "Directory ready"

# ── Download compose file ──────────────────────────────────────────────────────
step "Downloading compose file"
curl -fsSL "$COMPOSE_URL" -o "$INSTALL_DIR/compose.yaml"
ok "compose.yaml downloaded"

# ── Pull Docker image ──────────────────────────────────────────────────────────
step "Pulling Raveneye image from Docker Hub"
docker pull andrestao/raveneye:latest
ok "Image pulled"

# ── Start the stack ────────────────────────────────────────────────────────────
step "Starting the stack"
docker compose -f "$INSTALL_DIR/compose.yaml" --project-directory "$INSTALL_DIR" up -d
ok "Stack started"

# ── Wait for health ────────────────────────────────────────────────────────────
step "Waiting for Chromium to be ready"
for i in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8090/health 2>/dev/null | grep -q '"status":"ok"'; then
    ok "Stack healthy"; break
  fi
  printf "  waiting… (%s/20)\r" "$i"
  sleep 2
done
curl -fsS http://127.0.0.1:8090/health 2>/dev/null | grep -q '"status":"ok"' || \
  echo -e "${RED}⚠ Stack may still be starting — check: docker logs raveneye-raveneye-1${RESET}"

# ── Install MCP server ─────────────────────────────────────────────────────────
step "Installing MCP server (npm)"
npm install -g raveneye-mcp
ok "raveneye-mcp installed globally"

# ── Register with Claude Code ──────────────────────────────────────────────────
step "Registering with Claude Code"
if command -v claude >/dev/null 2>&1; then
  claude mcp add raveneye -- raveneye-mcp 2>/dev/null && ok "Registered" || ok "Already registered"
else
  echo "  claude CLI not found — run once Claude Code is installed:"
  echo "  claude mcp add raveneye -- raveneye-mcp"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━ Raveneye is ready ━━━${RESET}"
echo ""
echo "  Browser (watch):  http://127.0.0.1:6080"
echo "  Dashboard:        http://127.0.0.1:8090"
echo "  Artifacts:        $INSTALL_DIR/artifacts"
echo ""
echo "  Open a NEW Claude Code conversation and type /mcp"
echo "  You should see 'raveneye' with 11 tools."
echo ""
echo "  Stop:    docker compose -f $INSTALL_DIR/compose.yaml --project-directory $INSTALL_DIR down"
echo "  Update:  docker pull andrestao/raveneye:latest && npm update -g raveneye-mcp"
