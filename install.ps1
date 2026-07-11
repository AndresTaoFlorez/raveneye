# Raveneye installer — Windows (PowerShell 5+)
# Usage: irm https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.ps1 | iex
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$REPO        = "https://github.com/AndresTaoFlorez/raveneye.git"
$BRANCH      = "main"
$INSTALL_DIR = if ($env:RAVENEYE_HOME) { $env:RAVENEYE_HOME } else { "$HOME\.raveneye" }

function Step  ($msg) { Write-Host "`n$msg" -ForegroundColor Cyan }
function Ok    ($msg) { Write-Host "  v $msg" -ForegroundColor Green }
function Fail  ($msg) { Write-Host "  x $msg" -ForegroundColor Red; exit 1 }

Write-Host "=== Raveneye Installer ===" -ForegroundColor White

# ── Prerequisites ──────────────────────────────────────────────────────────────
Step "Checking prerequisites"

if (-not (Get-Command git   -ErrorAction SilentlyContinue)) { Fail "git not found. Install from https://git-scm.com and re-run." }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail "docker not found. Install Docker Desktop and re-run." }
if (-not (Get-Command node  -ErrorAction SilentlyContinue)) { Fail "node not found. Install Node.js 22 LTS from https://nodejs.org and re-run." }
if (-not (Get-Command npm   -ErrorAction SilentlyContinue)) { Fail "npm not found (should come with Node.js)." }

try { docker info | Out-Null } catch { Fail "Docker daemon is not running. Start Docker Desktop and re-run." }

$nodeMajor = [int](node -e "console.log(process.versions.node.split('.')[0])")
if ($nodeMajor -lt 22) { Fail "Node.js >= 22 required (found $nodeMajor). Upgrade from https://nodejs.org." }

Ok "git, docker, node $nodeMajor, npm — all present"

# ── Clone or update ────────────────────────────────────────────────────────────
Step "Installing Raveneye to $INSTALL_DIR"

if (Test-Path "$INSTALL_DIR\.git") {
    Write-Host "  Found existing install — pulling latest"
    git -C $INSTALL_DIR fetch --quiet origin $BRANCH
    git -C $INSTALL_DIR checkout --quiet $BRANCH
    git -C $INSTALL_DIR pull --quiet --ff-only origin $BRANCH
    Ok "Updated"
} else {
    git clone --quiet --branch $BRANCH --depth 1 $REPO $INSTALL_DIR
    Ok "Cloned"
}

Set-Location $INSTALL_DIR

# ── Config ─────────────────────────────────────────────────────────────────────
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Ok "Created .env from defaults (edit $INSTALL_DIR\.env to customise)"
} else {
    Ok ".env already exists — keeping it"
}

# ── Docker stack ───────────────────────────────────────────────────────────────
Step "Building Docker image (first run takes ~2 min)"
docker compose build --quiet
Ok "Image built"

Step "Starting the stack"
docker compose up -d
Ok "Stack started"

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
if (-not $ready) { Write-Host "  Stack slow to start — check: docker compose logs raveneye" -ForegroundColor Yellow }

# ── Build MCP server ───────────────────────────────────────────────────────────
Step "Building MCP server"
npm install --silent 2>&1 | Out-Null
npm run build --silent 2>&1 | Out-Null
Ok "MCP server compiled"

# ── Register with Claude Code ──────────────────────────────────────────────────
Step "Registering MCP server with Claude Code"
$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($claudeCmd) {
    try {
        claude mcp add raveneye -- node "$INSTALL_DIR\apps\mcp-server\dist\index.js"
        Ok "Registered"
    } catch {
        Ok "Already registered (or registration skipped)"
    }
} else {
    Write-Host "  claude CLI not found — run this once Claude Code is installed:" -ForegroundColor Yellow
    Write-Host "  claude mcp add raveneye -- node `"$INSTALL_DIR\apps\mcp-server\dist\index.js`"" -ForegroundColor White
}

# ── Done ───────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Raveneye is ready ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Browser (watch):  http://127.0.0.1:6080"
Write-Host "  Dashboard:        http://127.0.0.1:8090"
Write-Host "  Install location: $INSTALL_DIR"
Write-Host ""
Write-Host "  Open a NEW Claude Code conversation and type /mcp"
Write-Host "  You should see 'raveneye' with 11 tools."
Write-Host ""
Write-Host "  Stop:    docker compose -f $INSTALL_DIR\compose.yaml down"
Write-Host "  Restart: docker compose -f $INSTALL_DIR\compose.yaml up -d"
