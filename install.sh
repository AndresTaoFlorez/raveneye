#!/usr/bin/env bash
# Raveneye installer — Linux / macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.sh | bash
set -euo pipefail

REPO="https://github.com/AndresTaoFlorez/raveneye.git"
BRANCH="main"
INSTALL_DIR="${RAVENEYE_HOME:-$HOME/.raveneye}"
BOLD='\033[1m'; GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'

step() { echo -e "\n${BOLD}$1${RESET}"; }
ok()   { echo -e "${GREEN}✔ $1${RESET}"; }
fail() { echo -e "${RED}✘ $1${RESET}" >&2; exit 1; }

echo -e "${BOLD}━━━ Raveneye Installer ━━━${RESET}"

# ── Prerequisites ──────────────────────────────────────────────────────────────
step "Checking prerequisites"
command -v git    >/dev/null 2>&1 || fail "git is required. Install it and re-run."
command -v docker >/dev/null 2>&1 || fail "docker is required. Install Docker Engine and re-run."
command -v node   >/dev/null 2>&1 || fail "node >= 22 is required. Install Node.js from https://nodejs.org and re-run."
command -v npm    >/dev/null 2>&1 || fail "npm is required (comes with Node.js)."
docker info       >/dev/null 2>&1 || fail "Docker daemon is not running. Start Docker and re-run."
NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
[[ "$NODE_MAJOR" -ge 22 ]] || fail "Node.js >= 22 required (found $NODE_MAJOR). Upgrade from https://nodejs.org."
ok "git, docker, node $NODE_MAJOR, npm — all present"

# ── Clone or update ────────────────────────────────────────────────────────────
step "Installing Raveneye to $INSTALL_DIR"
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Found existing install — pulling latest"
  git -C "$INSTALL_DIR" fetch --quiet origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout --quiet "$BRANCH"
  git -C "$INSTALL_DIR" pull --quiet --ff-only origin "$BRANCH"
  ok "Updated"
else
  git clone --quiet --branch "$BRANCH" --depth 1 "$REPO" "$INSTALL_DIR"
  ok "Cloned"
fi

cd "$INSTALL_DIR"

# ── Config ─────────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  ok "Created .env from defaults (edit $INSTALL_DIR/.env to customise)"
else
  ok ".env already exists — keeping it"
fi

# ── Docker stack ───────────────────────────────────────────────────────────────
step "Building Docker image (first run takes ~2 min)"
docker compose build --quiet
ok "Image built"

step "Starting the stack"
docker compose up -d
ok "Stack started"

step "Waiting for Chromium to be ready"
for i in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8090/health 2>/dev/null | grep -q '"status":"ok"'; then
    ok "Stack healthy"; break
  fi
  printf "  waiting… (%s/20)\r" "$i"
  sleep 2
done
curl -fsS http://127.0.0.1:8090/health | grep -q '"status":"ok"' || {
  echo "Stack is slow to start — check with: docker compose logs raveneye"
}

# ── Build MCP server ───────────────────────────────────────────────────────────
step "Building MCP server"
npm install --silent
npm run build --silent
ok "MCP server compiled"

# ── Register with Claude Code ──────────────────────────────────────────────────
step "Registering MCP server with Claude Code"
if command -v claude >/dev/null 2>&1; then
  claude mcp add raveneye -- node "$INSTALL_DIR/apps/mcp-server/dist/index.js" 2>/dev/null && ok "Registered" || ok "Already registered"
else
  echo "  claude CLI not found — run this command manually once Claude Code is installed:"
  echo "  claude mcp add raveneye -- node \"$INSTALL_DIR/apps/mcp-server/dist/index.js\""
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━ Raveneye is ready ━━━${RESET}"
echo ""
echo "  Browser (watch):  http://127.0.0.1:6080"
echo "  Dashboard:        http://127.0.0.1:8090"
echo "  Install location: $INSTALL_DIR"
echo ""
echo "  Open a NEW Claude Code conversation and type /mcp"
echo "  You should see 'raveneye' with 11 tools."
echo ""
echo "  Stop:    docker compose -f $INSTALL_DIR/compose.yaml down"
echo "  Restart: docker compose -f $INSTALL_DIR/compose.yaml up -d"
