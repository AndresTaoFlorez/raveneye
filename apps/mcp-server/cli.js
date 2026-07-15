#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync, execSync } from 'node:child_process';
import { platform } from 'node:process';

const RAVENEYE_MCP = { command: 'npx', args: ['--yes', 'raveneye-mcp-server'] };
const INSTALL_DIR = process.env.RAVENEYE_HOME ?? join(homedir(), '.raveneye');
const COMPOSE_FILE = join(INSTALL_DIR, 'compose.yaml');
const COMPOSE_URL =
  'https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/compose.hub.yaml';
const IMAGE = 'andrestao577/raveneye:latest';
const API = 'http://127.0.0.1:8090';
const DASHBOARD = `${API}/overview`;
const WATCH = 'http://127.0.0.1:6080/vnc.html?autoconnect=true&resize=scale';

// Cada target sabe cómo registrar el MCP server en su cliente.
// Agregar uno nuevo = añadir una entrada aquí.
const TARGETS = {
  claude: () => {
    execSync('claude mcp add raveneye -- npx --yes raveneye-mcp-server', { stdio: 'inherit' });
  },
  codex: () => registerToml(join(homedir(), '.codex', 'config.toml'), '[mcp_servers.raveneye]'),
  zcode: () => registerJson(join(homedir(), '.zcode', 'cli', 'config.json'), ['mcp', 'servers']),
};

function step(message) {
  console.log(`\n${message}`);
}

function run(command, args, opts = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...opts });
}

async function download(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${url} returned ${res.status}`);
  writeFileSync(path, await res.text());
}

async function waitForHealth() {
  for (let i = 1; i <= 30; i += 1) {
    try {
      const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const body = await res.json();
        if (body.status === 'ok') return true;
      }
    } catch {
      // Retry until the stack is ready or the timeout expires.
    }
    process.stdout.write(`waiting for Raveneye (${i}/30)\r`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

function openUrl(url) {
  try {
    if (platform === 'win32') {
      execFileSync('powershell', ['-NoProfile', '-Command', 'Start-Process', url], {
        stdio: 'ignore',
      });
    } else if (platform === 'darwin') {
      execFileSync('open', [url], { stdio: 'ignore' });
    } else {
      execFileSync('xdg-open', [url], { stdio: 'ignore' });
    }
  } catch {
    console.log(`Open manually: ${url}`);
  }
}

async function fix(target = 'codex') {
  step('Preparing ~/.raveneye');
  mkdirSync(join(INSTALL_DIR, 'artifacts'), { recursive: true });
  await download(COMPOSE_URL, COMPOSE_FILE);

  step('Updating Raveneye image');
  run('docker', ['pull', IMAGE]);

  step('Starting or repairing Raveneye stack');
  run('docker', ['compose', '-f', COMPOSE_FILE, '--project-directory', INSTALL_DIR, 'up', '-d']);

  step('Checking health');
  const healthy = await waitForHealth();
  if (!healthy) {
    console.error('\nRaveneye did not become healthy. Recent logs:');
    run('docker', [
      'compose',
      '-f',
      COMPOSE_FILE,
      '--project-directory',
      INSTALL_DIR,
      'logs',
      '--tail=80',
      'raveneye',
    ]);
    process.exit(1);
  }
  console.log('\nRaveneye healthy');

  if (target !== 'none') {
    step(`Registering MCP for ${target}`);
    const handler = TARGETS[target];
    if (!handler) {
      console.error(
        `Unknown target: ${target}. Use one of: ${Object.keys(TARGETS).join(', ')}, none`,
      );
      process.exit(1);
    }
    handler();
  }

  step('Opening dashboard');
  openUrl(DASHBOARD);
  console.log(`Dashboard: ${DASHBOARD}`);
  console.log(`Watched browser: ${WATCH}`);
}

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
  process.exit(0);
} else if (cmd === 'fix' || cmd === 'doctor' || cmd === 'install' || cmd === 'up') {
  await fix(target ?? 'codex');
  process.exit(0);
} else if (cmd === 'open') {
  openUrl(DASHBOARD);
  console.log(`Dashboard: ${DASHBOARD}`);
  console.log(`Watched browser: ${WATCH}`);
  process.exit(0);
} else {
  await import('./dist/index.js');
}
