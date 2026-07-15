#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

const RAVENEYE_MCP = { command: 'npx', args: ['--yes', 'raveneye-mcp-server'] };

// Cada target sabe cómo registrar el MCP server en su cliente.
// Agregar uno nuevo = añadir una entrada aquí.
const TARGETS = {
  claude: () => {
    execSync('claude mcp add raveneye -- npx --yes raveneye-mcp-server', { stdio: 'inherit' });
  },
  codex: () => registerToml(join(homedir(), '.codex', 'config.toml'), '[mcp_servers.raveneye]'),
  zcode: () => registerJson(join(homedir(), '.zcode', 'cli', 'config.json'), ['mcp', 'servers']),
};

// Escribe un bloque en un archivo TOML si no existe ya.
function registerToml(cfgPath, block) {
  const existing = existsSync(cfgPath) ? readFileSync(cfgPath, 'utf8') : '';
  if (existing.includes('[mcp_servers.raveneye]')) {
    console.log(`raveneye already registered in ${cfgPath}`);
    return;
  }
  mkdirSync(join(cfgPath, '..'), { recursive: true });
  const snippet = `\n${block}\ncommand = "${RAVENEYE_MCP.command}"\nargs = ${JSON.stringify(RAVENEYE_MCP.args)}\n`;
  writeFileSync(cfgPath, existing + snippet);
  console.log(`Registered raveneye in ${cfgPath}`);
}

// Escribe la entrada del servidor en un archivo JSON anidado si no existe.
function registerJson(cfgPath, keys) {
  mkdirSync(join(cfgPath, '..'), { recursive: true });
  const config = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
  const node = keys.reduce((obj, k) => (obj[k] ??= {}), config);
  if (node.raveneye) {
    console.log(`raveneye already registered in ${cfgPath}`);
    return;
  }
  node.raveneye = RAVENEYE_MCP;
  writeFileSync(cfgPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`Registered raveneye in ${cfgPath}`);
}

const [, , cmd, target] = process.argv;

if (cmd === 'setup') {
  const handler = TARGETS[target];
  if (!handler) {
    console.error(`Usage: raveneye-mcp-server setup <${Object.keys(TARGETS).join('|')}>`);
    process.exit(1);
  }
  handler();
} else {
  await import('./dist/index.js');
}
