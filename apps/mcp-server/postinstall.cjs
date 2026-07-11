#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

const MCP_ENTRY = { command: 'npx', args: ['--yes', 'raveneye-mcp-server'] };

// Claude Code
try {
  execSync('claude mcp add raveneye -- npx --yes raveneye-mcp-server', { stdio: 'pipe' });
  console.log('raveneye-mcp-server: registered with Claude Code');
} catch { /* claude CLI not present */ }

// Codex (@openai/codex)
try {
  const dir = join(homedir(), '.codex');
  const cfg = join(dir, 'config.json');
  const config = existsSync(cfg) ? JSON.parse(readFileSync(cfg, 'utf8')) : {};
  config.mcpServers = config.mcpServers ?? {};
  if (!config.mcpServers.raveneye) {
    config.mcpServers.raveneye = MCP_ENTRY;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(cfg, JSON.stringify(config, null, 2));
    console.log('raveneye-mcp-server: registered with Codex (~/.codex/config.json)');
  }
} catch { /* codex config not writable */ }

console.log(`
raveneye-mcp-server installed.
Requires the Raveneye Docker stack — start it before using:
  Linux/Mac:  make up
  Windows:    docker compose up -d
Health check: curl http://127.0.0.1:8090/health
`);
