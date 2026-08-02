#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { platform } from 'node:process';

const RAVENEYE_MCP = { command: 'npx', args: ['--yes', 'raveneye-mcp-server@latest'] };
const INSTALL_DIR = process.env.RAVENEYE_HOME ?? join(homedir(), '.raveneye');
const COMPOSE_FILE = join(INSTALL_DIR, 'compose.yaml');
const ENV_FILE = join(INSTALL_DIR, '.env');
const COMPOSE_URL =
  'https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/compose.hub.yaml';
const IMAGE = 'andrestao577/raveneye:latest';

// Host-side ports. When any default is taken, the whole set shifts by a single
// offset so the layout stays coherent (main ports adjacent to session ranges).
const DEFAULT_PORTS = {
  RAVENEYE_NOVNC_PORT: 6080,
  RAVENEYE_CDP_PORT: 9222,
  RAVENEYE_API_PORT: 8090,
  RAVENEYE_SESSION_NOVNC_PORT_START: 6081,
  RAVENEYE_SESSION_NOVNC_PORT_END: 6100,
  RAVENEYE_SESSION_CDP_PORT_START: 9223,
  RAVENEYE_SESSION_CDP_PORT_END: 9232,
};

function readEnvPorts() {
  if (!existsSync(ENV_FILE)) return null;
  const ports = { ...DEFAULT_PORTS };
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(\w+)=(\d+)\s*$/);
    if (m && m[1] in ports) ports[m[1]] = Number(m[2]);
  }
  return ports;
}

function urls(ports = readEnvPorts() ?? DEFAULT_PORTS) {
  const api = `http://127.0.0.1:${ports.RAVENEYE_API_PORT}`;
  return {
    api,
    dashboard: `${api}/overview`,
    watch: `http://127.0.0.1:${ports.RAVENEYE_NOVNC_PORT}/vnc.html?autoconnect=true&resize=scale`,
  };
}

// Env vars baked into the MCP registration so the client finds the stack
// even when it runs on non-default ports.
function mcpEnv() {
  const ports = readEnvPorts() ?? DEFAULT_PORTS;
  return {
    RAVENEYE_API: `http://127.0.0.1:${ports.RAVENEYE_API_PORT}`,
    RAVENEYE_CDP: `http://127.0.0.1:${ports.RAVENEYE_CDP_PORT}`,
  };
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => srv.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
}

async function allFree(ports) {
  const list = [ports.RAVENEYE_NOVNC_PORT, ports.RAVENEYE_CDP_PORT, ports.RAVENEYE_API_PORT];
  for (let p = ports.RAVENEYE_SESSION_NOVNC_PORT_START; p <= ports.RAVENEYE_SESSION_NOVNC_PORT_END; p += 1)
    list.push(p);
  for (let p = ports.RAVENEYE_SESSION_CDP_PORT_START; p <= ports.RAVENEYE_SESSION_CDP_PORT_END; p += 1)
    list.push(p);
  return (await Promise.all(list.map(portFree))).every(Boolean);
}

function shiftPorts(ports, offset) {
  return Object.fromEntries(Object.entries(ports).map(([k, v]) => [k, v + offset]));
}

async function choosePorts() {
  // If our stack is already up, its own bindings would look "taken" — keep
  // whatever ports it is running on instead of probing.
  try {
    const running = execFileSync(
      'docker',
      ['compose', '-f', COMPOSE_FILE, '--project-directory', INSTALL_DIR, 'ps', '-q'],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .toString()
      .trim();
    if (running) return readEnvPorts() ?? { ...DEFAULT_PORTS };
  } catch {
    // No stack yet (or compose unavailable) — probe for free ports below.
  }
  for (let offset = 0; offset <= 9000; offset += 1000) {
    const candidate = shiftPorts(DEFAULT_PORTS, offset);
    if (await allFree(candidate)) {
      if (offset > 0)
        console.log(`Default ports busy — using offset +${offset} (API on ${candidate.RAVENEYE_API_PORT})`);
      return candidate;
    }
  }
  console.error('No free port range found for Raveneye (tried offsets +0 to +9000).');
  process.exit(1);
}

// Cada target sabe cómo registrar el MCP server en su cliente.
// Agregar uno nuevo = añadir una entrada aquí.
const TARGETS = {
  claude: () => {
    // Earlier versions registered without a scope (= local, tied to the cwd
    // where the installer ran), so sweep both scopes before re-adding.
    for (const scope of ['user', 'local']) {
      try {
        execSync(`claude mcp remove raveneye -s ${scope}`, { stdio: 'ignore' });
      } catch {
        // raveneye was not registered in this scope — nothing to replace.
      }
    }
    const envFlags = Object.entries(mcpEnv())
      .map(([k, v]) => `-e ${k}=${v}`)
      .join(' ');
    try {
      execSync(
        `claude mcp add raveneye -s user ${envFlags} -- ${RAVENEYE_MCP.command} ${RAVENEYE_MCP.args.join(' ')}`,
        { stdio: 'inherit' },
      );
    } catch {
      console.error('\nCould not register with the `claude` CLI. Is Claude Code installed?');
      console.error('Install it, then re-run: npx --yes raveneye-mcp-server@latest setup claude');
      process.exit(1);
    }
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

async function waitForHealth(api) {
  for (let i = 1; i <= 30; i += 1) {
    try {
      const res = await fetch(`${api}/health`, { signal: AbortSignal.timeout(2000) });
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
  try {
    run('docker', ['pull', IMAGE]);
  } catch {
    console.error('\ndocker pull failed (see error above). Common causes:');
    console.error('  - Daemon not running: sudo systemctl enable --now docker');
    console.error(
      '  - Permission denied on /var/run/docker.sock: sudo usermod -aG docker $USER, then log out and back in (or run `newgrp docker`)',
    );
    process.exit(1);
  }

  step('Choosing ports');
  const ports = await choosePorts();
  writeFileSync(
    ENV_FILE,
    Object.entries(ports)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n') + '\n',
  );

  step('Starting or repairing Raveneye stack');
  run('docker', ['compose', '-f', COMPOSE_FILE, '--project-directory', INSTALL_DIR, 'up', '-d']);

  step('Checking health');
  const { api, dashboard, watch } = urls(ports);
  const healthy = await waitForHealth(api);
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
  openUrl(dashboard);
  console.log(`Dashboard: ${dashboard}`);
  console.log(`Watched browser: ${watch}`);
}

function tomlSection(header, mcp) {
  const env = Object.entries(mcpEnv())
    .map(([k, v]) => `${k} = "${v}"`)
    .join(', ');
  return `${header}\ncommand = "${mcp.command}"\nargs = ${JSON.stringify(mcp.args)}\nenv = { ${env} }\n`;
}

// Escribe o actualiza un bloque TOML.
function registerToml(cfgPath, block) {
  const existing = existsSync(cfgPath) ? readFileSync(cfgPath, 'utf8') : '';
  mkdirSync(dirname(cfgPath), { recursive: true });
  const replacement = tomlSection(block, RAVENEYE_MCP);
  const lines = existing.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === block);
  if (start >= 0) {
    let end = lines.findIndex((line, index) => index > start && /^\s*\[.+\]\s*$/.test(line));
    if (end < 0) end = lines.length;
    lines.splice(start, end - start, ...replacement.trimEnd().split('\n'));
    writeFileSync(cfgPath, lines.join('\n').replace(/\n*$/, '\n'));
    console.log(`Updated raveneye in ${cfgPath}`);
    return;
  }
  writeFileSync(cfgPath, `${existing.replace(/\n*$/, '')}\n\n${replacement}`);
  console.log(`Registered raveneye in ${cfgPath}`);
}

// Escribe la entrada del servidor en un archivo JSON anidado si no existe.
function registerJson(cfgPath, keys) {
  mkdirSync(dirname(cfgPath), { recursive: true });
  const config = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
  const node = keys.reduce((obj, k) => (obj[k] ??= {}), config);
  node.raveneye = { ...RAVENEYE_MCP, env: mcpEnv() };
  writeFileSync(cfgPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`Updated raveneye in ${cfgPath}`);
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
  const { dashboard, watch } = urls();
  openUrl(dashboard);
  console.log(`Dashboard: ${dashboard}`);
  console.log(`Watched browser: ${watch}`);
  process.exit(0);
} else {
  await import('./dist/index.js');
}
