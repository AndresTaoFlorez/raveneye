# Raveneye installer — Windows (PowerShell 5+)
# Usage: irm https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.ps1 | iex
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$INSTALL_DIR  = if ($env:RAVENEYE_HOME) { $env:RAVENEYE_HOME } else { "$HOME\.raveneye" }
$COMPOSE_URL  = "https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/compose.hub.yaml"

function Step ($msg) { Write-Host "`n$msg" -ForegroundColor Cyan }
function Ok   ($msg) { Write-Host "  v $msg" -ForegroundColor Green }
function Fail ($msg) { Write-Host "  x $msg" -ForegroundColor Red; exit 1 }

Write-Host "=== Raveneye Installer ===" -ForegroundColor White

# ── Prerequisites ──────────────────────────────────────────────────────────────
Step "Checking prerequisites"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail "docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop" }
if (-not (Get-Command node   -ErrorAction SilentlyContinue)) { Fail "node not found. Install Node.js 22 LTS: https://nodejs.org" }
if (-not (Get-Command npm    -ErrorAction SilentlyContinue)) { Fail "npm not found (comes with Node.js)." }
try { docker info | Out-Null } catch { Fail "Docker daemon is not running. Start Docker Desktop and re-run." }
$nodeMajor = [int](node -e "console.log(process.versions.node.split('.')[0])")
if ($nodeMajor -lt 22) { Fail "Node.js >= 22 required (found $nodeMajor). Upgrade from https://nodejs.org." }
Ok "docker, node $nodeMajor, npm — all present"

# ── Create install directory ───────────────────────────────────────────────────
Step "Setting up $INSTALL_DIR"
New-Item -ItemType Directory -Force "$INSTALL_DIR\artifacts" | Out-Null
Ok "Directory ready"

# ── Download compose file ──────────────────────────────────────────────────────
Step "Downloading compose file"
Invoke-WebRequest $COMPOSE_URL -OutFile "$INSTALL_DIR\compose.yaml"
Ok "compose.yaml downloaded"

# ── Pull Docker image ──────────────────────────────────────────────────────────
Step "Pulling Raveneye image from Docker Hub"
docker pull andrestao/raveneye:latest
Ok "Image pulled"

# ── Start the stack ────────────────────────────────────────────────────────────
Step "Starting the stack"
docker compose -f "$INSTALL_DIR\compose.yaml" --project-directory "$INSTALL_DIR" up -d
Ok "Stack started"

# ── Wait for health ────────────────────────────────────────────────────────────
Step "Waiting for Chromium to be ready"
$ready = $false
for ($i = 1; $i -le 20; $i++) {
    try {
        $h = Invoke-RestMethod http://127.0.0.1:8090/health -TimeoutSec 2 -ErrorAction Stop
        if ($h.status -eq "ok") { $ready = $true; Ok "Stack healthy"; break }
    } catch {}
    Write-Host "  waiting... ($i/20)" -NoNewline
    Write-Host "`r" -NoNewline
    Start-Sleep 2
}
if (-not $ready) { Write-Host "  Stack may still be starting — check: docker logs raveneye-raveneye-1" -ForegroundColor Yellow }

# ── Install MCP server ─────────────────────────────────────────────────────────
Step "Installing MCP server (npm)"
npm install -g raveneye-mcp
Ok "raveneye-mcp installed globally"

# ── Register with Claude Code ──────────────────────────────────────────────────
Step "Registering with Claude Code"
$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($claudeCmd) {
    try { claude mcp add raveneye -- raveneye-mcp; Ok "Registered" }
    catch { Ok "Already registered (or skipped)" }
} else {
    Write-Host "  claude CLI not found — run once Claude Code is installed:" -ForegroundColor Yellow
    Write-Host "  claude mcp add raveneye -- raveneye-mcp"
}

# ── Done ───────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Raveneye is ready ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Browser (watch):  http://127.0.0.1:6080"
Write-Host "  Dashboard:        http://127.0.0.1:8090"
Write-Host "  Artifacts:        $INSTALL_DIR\artifacts"
Write-Host ""
Write-Host "  Open a NEW Claude Code conversation and type /mcp"
Write-Host "  You should see 'raveneye' with 11 tools."
Write-Host ""
Write-Host "  Stop:    docker compose -f $INSTALL_DIR\compose.yaml --project-directory $INSTALL_DIR down"
Write-Host "  Update:  docker pull andrestao/raveneye:latest; npm update -g raveneye-mcp"
