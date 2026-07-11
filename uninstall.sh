#!/usr/bin/env bash
# Raveneye uninstaller — Linux / macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/uninstall.sh | bash
set -euo pipefail

INSTALL_DIR="${RAVENEYE_HOME:-$HOME/.raveneye}"
BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RESET='\033[0m'

echo -e "${BOLD}━━━ Raveneye Uninstaller ━━━${RESET}"

# ── Stop and remove Docker stack ──────────────────────────────────────────────
if [ -f "$INSTALL_DIR/compose.yaml" ]; then
  echo -e "\n${BOLD}Stopping Docker stack${RESET}"
  docker compose -f "$INSTALL_DIR/compose.yaml" down --volumes 2>/dev/null && \
    echo -e "${GREEN}✔ Containers and volumes removed${RESET}" || \
    echo -e "${YELLOW}⚠ No running containers found (already stopped)${RESET}"
else
  echo -e "${YELLOW}⚠ compose.yaml not found — skipping Docker cleanup${RESET}"
fi

# ── Remove Docker image ───────────────────────────────────────────────────────
echo -e "\n${BOLD}Removing Docker image${RESET}"
docker rmi andrestao577/raveneye:latest 2>/dev/null && \
  echo -e "${GREEN}✔ Image removed${RESET}" || \
  echo -e "${YELLOW}⚠ Image not found (already removed)${RESET}"

# ── Uninstall npm package ─────────────────────────────────────────────────────
echo -e "\n${BOLD}Uninstalling raveneye-mcp${RESET}"
npm uninstall -g raveneye-mcp 2>/dev/null && \
  echo -e "${GREEN}✔ raveneye-mcp removed${RESET}" || \
  echo -e "${YELLOW}⚠ raveneye-mcp was not installed globally${RESET}"

# ── Remove MCP registration ───────────────────────────────────────────────────
echo -e "\n${BOLD}Removing MCP server registration${RESET}"
if command -v claude >/dev/null 2>&1; then
  claude mcp remove raveneye 2>/dev/null && \
    echo -e "${GREEN}✔ MCP server unregistered${RESET}" || \
    echo -e "${YELLOW}⚠ MCP server was not registered (nothing to remove)${RESET}"
else
  echo -e "${YELLOW}⚠ claude CLI not found — skipping MCP unregistration${RESET}"
fi

# ── Delete install directory ──────────────────────────────────────────────────
echo -e "\n${BOLD}Deleting $INSTALL_DIR${RESET}"
if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  echo -e "${GREEN}✔ Deleted${RESET}"
else
  echo -e "${YELLOW}⚠ Directory not found (already deleted)${RESET}"
fi

echo ""
echo -e "${GREEN}${BOLD}━━━ Raveneye fully removed ━━━${RESET}"
