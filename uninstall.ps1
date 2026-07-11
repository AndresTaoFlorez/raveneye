# Raveneye uninstaller — Windows (PowerShell 5+)
# Usage: irm https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/uninstall.ps1 | iex
#Requires -Version 5.1
$ErrorActionPreference = 'SilentlyContinue'

$INSTALL_DIR = if ($env:RAVENEYE_HOME) { $env:RAVENEYE_HOME } else { "$HOME\.raveneye" }

function Step ($msg) { Write-Host "`n$msg" -ForegroundColor Cyan }
function Ok   ($msg) { Write-Host "  v $msg" -ForegroundColor Green }
function Warn ($msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }

Write-Host "=== Raveneye Uninstaller ===" -ForegroundColor White

# ── Stop and remove Docker stack ──────────────────────────────────────────────
Step "Stopping Docker stack"
$composePath = Join-Path $INSTALL_DIR "compose.yaml"
if (Test-Path $composePath) {
    docker compose -f $composePath down --volumes 2>&1 | Out-Null
    Ok "Containers and volumes removed"
} else {
    Warn "compose.yaml not found — skipping Docker cleanup"
}

# ── Remove built Docker image ─────────────────────────────────────────────────
Step "Removing Docker image"
docker rmi raveneye-raveneye 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "Image removed" } else { Warn "Image not found (already removed)" }

# ── Remove MCP registration ───────────────────────────────────────────────────
Step "Removing MCP server registration"
$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($claudeCmd) {
    claude mcp remove raveneye 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok "MCP server unregistered" } else { Warn "MCP server was not registered (nothing to remove)" }
} else {
    Warn "claude CLI not found — skipping MCP unregistration"
}

# ── Delete install directory ──────────────────────────────────────────────────
Step "Deleting $INSTALL_DIR"
if (Test-Path $INSTALL_DIR) {
    Remove-Item -Recurse -Force $INSTALL_DIR
    Ok "Deleted"
} else {
    Warn "Directory not found (already deleted)"
}

Write-Host ""
Write-Host "=== Raveneye fully removed ===" -ForegroundColor Green
