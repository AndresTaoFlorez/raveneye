#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

const [, , cmd, target] = process.argv;

if (cmd === 'setup') {
  if (target === 'codex') {
    const dir = join(homedir(), '.codex');
    const cfg = join(dir, 'config.toml');
    const block = `\n[mcp_servers.raveneye]\ncommand = "npx"\nargs = ["--yes", "raveneye-mcp-server"]\n`;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const existing = existsSync(cfg) ? readFileSync(cfg, 'utf8') : '';
    if (existing.includes('[mcp_servers.raveneye]')) {
      console.log('raveneye already registered in ~/.codex/config.toml');
    } else {
      writeFileSync(cfg, existing + block);
      console.log('Registered raveneye in ~/.codex/config.toml');
    }
  } else if (target === 'claude') {
    execSync('claude mcp add raveneye -- npx --yes raveneye-mcp-server', { stdio: 'inherit' });
  } else {
    console.error('Usage: raveneye-mcp-server setup <codex|claude>');
    process.exit(1);
  }
} else {
  await import('./dist/index.js');
}
