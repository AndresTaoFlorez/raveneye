import { ChildProcess, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { chromium, type BrowserContext } from 'playwright';
import { evaluateTargetUrl } from '@raveneye/shared';
import type { ObserverConfig } from './config.js';

export interface SessionPorts {
  display: string;
  vnc: number;
  novnc: number;
  cdp: number;
}

export interface SessionSpec {
  /** "base" for the legacy boot session, otherwise "sess-N". */
  slot: string;
  appId: string;
  ports: SessionPorts;
  viewportWidth: number;
  viewportHeight: number;
  targetUrl: string;
  allowedHosts: string[];
  profileMode: 'ephemeral' | 'persistent';
  profileDir: string;
  headless: boolean;
  ownerAgentId: string | null;
  ownerLabel: string | null;
}

export type SessionState = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';

export interface SessionHandle {
  id: string;
  slot: string;
  appId: string;
  state: SessionState;
  ports: SessionPorts;
  targetUrl: string;
  allowedHosts: string[];
  startedAt: string;
  stoppedAt: string | null;
  detail: string | null;
  novncUrl: string;
  cdpUrl: string;
  owner: SessionOwner | null;
}

export interface SessionRecord {
  id: string;
  observed_app_id: string | null;
  status: SessionState;
  target_url: string;
  display: string | null;
  novnc_url: string | null;
  cdp_url: string | null;
  api_url: string | null;
  started_at: string;
  stopped_at: string | null;
  owner_agent_id: string | null;
  owner_label: string | null;
}

export interface SessionOwner {
  agentId: string;
  label: string | null;
}

interface SessionRecordRow {
  id: string;
  observed_app_id: string | null;
  status: SessionState;
  target_url: string;
  display: string | null;
  novnc_url: string | null;
  cdp_url: string | null;
  api_url: string | null;
  started_at: string;
  stopped_at: string | null;
  owner_agent_id: string | null;
  owner_label: string | null;
}

interface InternalSession extends SessionHandle {
  spec: SessionSpec;
  processes: ChildProcess[];
  context: BrowserContext | null;
  userDataDir: string;
}

function spawnLogged(
  name: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): ChildProcess {
  const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.on('data', (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });
  child.stderr?.on('data', (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });
  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`[${name}] exited code=${code} signal=${signal}\n`);
    }
  });
  return child;
}

async function waitForFile(path: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(path)) return;
    await sleep(100);
  }
  throw new Error(`timeout waiting for ${path}`);
}

async function waitForCdp(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await sleep(200);
  }
  throw new Error(`CDP did not come up on port ${port} within ${timeoutMs}ms`);
}

async function firstPage(
  context: BrowserContext,
  timeoutMs: number,
): Promise<Awaited<ReturnType<BrowserContext['newPage']>>> {
  const existing = context.pages()[0];
  if (existing) return existing;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      context.off('page', onPage);
      reject(new Error('timeout waiting for Chromium app window'));
    }, timeoutMs);
    const onPage = (page: Awaited<ReturnType<BrowserContext['newPage']>>) => {
      clearTimeout(timeout);
      resolve(page);
    };
    context.once('page', onPage);
  });
}

export class SessionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionLimitError';
  }
}

export class SessionAlreadyRunningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionAlreadyRunningError';
  }
}

export class SessionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionNotFoundError';
  }
}

function rowToSessionRecord(row: SessionRecordRow): SessionRecord {
  return {
    id: row.id,
    observed_app_id: row.observed_app_id,
    status: row.status,
    target_url: row.target_url,
    display: row.display,
    novnc_url: row.novnc_url,
    cdp_url: row.cdp_url,
    api_url: row.api_url,
    started_at: row.started_at,
    stopped_at: row.stopped_at,
    owner_agent_id: row.owner_agent_id,
    owner_label: row.owner_label,
  };
}

function sessionOwner(agentId: string | null, label: string | null): SessionOwner | null {
  return agentId ? { agentId, label } : null;
}

export class SessionStore {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS observer_sessions (
        id TEXT PRIMARY KEY,
        observed_app_id TEXT,
        status TEXT NOT NULL,
        target_url TEXT NOT NULL,
        display TEXT,
        novnc_url TEXT,
        cdp_url TEXT,
        api_url TEXT,
        started_at TEXT NOT NULL,
        stopped_at TEXT,
        owner_agent_id TEXT,
        owner_label TEXT
      );
    `);
    this.ensureColumn('observer_sessions', 'owner_agent_id', 'TEXT');
    this.ensureColumn('observer_sessions', 'owner_label', 'TEXT');
  }

  private ensureColumn(table: string, column: string, type: string) {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((row) => row.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }

  close() {
    this.db.close();
  }

  list(): SessionRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM observer_sessions ORDER BY started_at DESC')
      .all() as unknown as SessionRecordRow[];
    return rows.map(rowToSessionRecord);
  }

  get(id: string): SessionRecord | null {
    const row = this.db
      .prepare('SELECT * FROM observer_sessions WHERE id = ?')
      .get(id) as unknown as SessionRecordRow | undefined;
    return row ? rowToSessionRecord(row) : null;
  }

  recordStarted(session: SessionHandle, apiUrl: string) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO observer_sessions (
          id, observed_app_id, status, target_url, display, novnc_url, cdp_url,
          api_url, started_at, stopped_at, owner_agent_id, owner_label
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        session.id,
        session.appId === 'shared' ? null : session.appId,
        session.state,
        session.targetUrl,
        session.ports.display,
        session.novncUrl,
        session.cdpUrl,
        apiUrl,
        session.startedAt,
        session.stoppedAt,
        session.owner?.agentId ?? null,
        session.owner?.label ?? null,
      );
  }

  updateStatus(id: string, status: SessionState, stoppedAt: string | null = null) {
    this.db
      .prepare(
        stoppedAt
          ? 'UPDATE observer_sessions SET status = ?, stopped_at = ? WHERE id = ?'
          : 'UPDATE observer_sessions SET status = ? WHERE id = ?',
      )
      .run(...(stoppedAt ? [status, stoppedAt, id] : [status, id]));
  }
}

function pidIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function cleanupStaleChromiumLocks(userDataDir: string): Promise<void> {
  const { lstat, readlink, unlink } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const lockPath = join(userDataDir, 'SingletonLock');
  try {
    const stat = await lstat(lockPath);
    if (!stat.isSymbolicLink()) return;
    const lockTarget = await readlink(lockPath);
    const pid = Number(lockTarget.match(/-(\d+)$/)?.[1]);
    if (!Number.isInteger(pid) || pid <= 0 || pidIsRunning(pid)) return;
    await Promise.all(
      ['SingletonCookie', 'SingletonLock', 'SingletonSocket'].map(async (name) => {
        try {
          await unlink(join(userDataDir, name));
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
        }
      }),
    );
    console.warn(`[sessions] removed stale Chromium profile lock for pid ${pid}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

export class SessionManager {
  private readonly sessions = new Map<string, InternalSession>();

  constructor(
    private readonly cfg: ObserverConfig,
    private readonly store: SessionStore | null = null,
    private readonly maxDynamicSessions: () => number = () => cfg.maxSessions,
  ) {}

  list(): SessionHandle[] {
    return [...this.sessions.values()].map(this.toHandle);
  }

  get(id: string): SessionHandle | null {
    const s = this.sessions.get(id);
    return s ? this.toHandle(s) : null;
  }

  findBySlot(slot: string): SessionHandle | null {
    for (const s of this.sessions.values()) {
      if (s.slot === slot) return this.toHandle(s);
    }
    return null;
  }

  findRunningForApp(appId: string): SessionHandle | null {
    for (const s of this.sessions.values()) {
      if (s.appId === appId && (s.state === 'starting' || s.state === 'running')) {
        return this.toHandle(s);
      }
    }
    return null;
  }

  findRunningForAppOwner(appId: string, agentId: string): SessionHandle | null {
    for (const s of this.sessions.values()) {
      if (
        s.appId === appId &&
        s.owner?.agentId === agentId &&
        (s.state === 'starting' || s.state === 'running')
      ) {
        return this.toHandle(s);
      }
    }
    return null;
  }

  count(): number {
    let n = 0;
    for (const s of this.sessions.values()) {
      if (s.slot !== 'base' && (s.state === 'starting' || s.state === 'running')) n += 1;
    }
    return n;
  }

  hasRoom(): boolean {
    return this.count() < this.maxDynamicSessions();
  }

  /** Boot the legacy "base" session that the existing public API depends on. */
  async startBase(opts: {
    appId: string;
    targetUrl: string;
    allowedHosts: string[];
    viewportWidth: number;
    viewportHeight: number;
  }): Promise<SessionHandle> {
    const profileDir =
      this.cfg.profileMode === 'persistent'
        ? this.cfg.persistentProfileDir
        : await mkdtemp('/tmp/raveneye-base-profile-');
    if (this.cfg.profileMode === 'persistent') {
      await mkdir(profileDir, { recursive: true });
    }
    await cleanupStaleChromiumLocks(profileDir);
    return this.boot({
      slot: 'base',
      appId: opts.appId,
      ports: {
        display: this.cfg.display,
        vnc: this.cfg.vncInternalPort,
        novnc: this.cfg.novncInternalPort,
        // The base session's CDP is the legacy published port (9222); chromium
        // listens one below (9221) so the socat forwarder matches the existing
        // compose port mapping.
        cdp: this.cfg.cdpInternalPort + 1,
      },
      viewportWidth: opts.viewportWidth,
      viewportHeight: opts.viewportHeight,
      targetUrl: opts.targetUrl,
      allowedHosts: opts.allowedHosts,
      profileMode: this.cfg.profileMode,
      profileDir,
      headless: this.cfg.headless,
      ownerAgentId: null,
      ownerLabel: null,
    });
  }

  async startForApp(opts: {
    appId: string;
    targetUrl: string;
    allowedHosts: string[];
    viewportWidth: number;
    viewportHeight: number;
    ownerAgentId?: string | null;
    ownerLabel?: string | null;
  }): Promise<SessionHandle> {
    if (!this.hasRoom()) {
      throw new SessionLimitError(
        `maximum of ${this.maxDynamicSessions()} dynamic app sessions reached`,
      );
    }

    const decision = evaluateTargetUrl(opts.targetUrl, { allowedHosts: opts.allowedHosts });
    if (!decision.allowed) {
      throw new SessionLimitError(`URL policy rejected target: ${decision.reason}`);
    }

    const slot = this.allocateSlot();
    const ports = this.portsForSlot(slot);
    const userDataDir = await mkdtemp(`/tmp/raveneye-session-${slot}-`);

    return this.boot({
      slot: String(slot),
      appId: opts.appId,
      ports,
      viewportWidth: opts.viewportWidth,
      viewportHeight: opts.viewportHeight,
      targetUrl: decision.url.toString(),
      allowedHosts: opts.allowedHosts,
      profileMode: 'ephemeral',
      profileDir: userDataDir,
      headless: this.cfg.headless,
      ownerAgentId: opts.ownerAgentId ?? null,
      ownerLabel: opts.ownerLabel ?? null,
    });
  }

  async stop(id: string): Promise<SessionHandle> {
    const session = this.sessions.get(id);
    if (!session) throw new SessionNotFoundError(`session ${id} not found`);
    session.state = 'stopping';
    await this.cleanup(session);
    session.state = 'stopped';
    session.stoppedAt = new Date().toISOString();
    session.context = null;
    this.sessions.delete(id);
    const stopped = this.toHandle(session);
    this.store?.updateStatus(stopped.id, stopped.state, stopped.stoppedAt);
    return stopped;
  }

  async stopAll(): Promise<void> {
    const ids = [...this.sessions.keys()];
    for (const id of ids) {
      try {
        await this.stop(id);
      } catch (err) {
        process.stderr.write(`[sessions] stop ${id} failed: ${(err as Error).message}\n`);
      }
    }
  }

  toHandle(s: InternalSession): SessionHandle {
    return {
      id: s.id,
      slot: s.slot,
      appId: s.appId,
      state: s.state,
      ports: s.ports,
      targetUrl: s.targetUrl,
      allowedHosts: s.allowedHosts,
      startedAt: s.startedAt,
      stoppedAt: s.stoppedAt,
      detail: s.detail,
      novncUrl: s.novncUrl,
      cdpUrl: s.cdpUrl,
      owner: sessionOwner(s.spec.ownerAgentId, s.spec.ownerLabel),
    };
  }

  /** @internal — for the API layer to drive a session's context. */
  contextOf(id: string): BrowserContext | null {
    return this.sessions.get(id)?.context ?? null;
  }

  private allocateSlot(): number {
    for (let i = 0; i < this.maxDynamicSessions(); i += 1) {
      if (!this.slotInUse(i)) return i;
    }
    throw new SessionLimitError('no free slots');
  }

  private slotInUse(slot: number): boolean {
    for (const s of this.sessions.values()) {
      if (s.slot === String(slot) && (s.state === 'starting' || s.state === 'running')) return true;
    }
    return false;
  }

  private portsForSlot(slot: number): SessionPorts {
    return {
      display: `:${this.cfg.sessionDisplayStart - slot}`,
      vnc: this.cfg.sessionVncPortStart + slot * 2,
      novnc: this.cfg.sessionNovncPortStart + slot * 2,
      cdp: this.cfg.sessionCdpPortStart + slot,
    };
  }

  private async boot(spec: SessionSpec): Promise<SessionHandle> {
    if (this.findBySlot(spec.slot)) {
      throw new SessionAlreadyRunningError(`slot ${spec.slot} already in use`);
    }
    if (spec.profileMode === 'persistent') {
      await mkdir(spec.profileDir, { recursive: true });
    }
    await cleanupStaleChromiumLocks(spec.profileDir);

    const id = `sess-${spec.slot}-${Date.now().toString(36)}`;
    const handle: SessionHandle = {
      id,
      slot: spec.slot,
      appId: spec.appId,
      state: 'starting',
      ports: spec.ports,
      targetUrl: spec.targetUrl,
      allowedHosts: spec.allowedHosts,
      startedAt: new Date().toISOString(),
      stoppedAt: null,
      detail: null,
      novncUrl: `http://127.0.0.1:${spec.ports.novnc}/vnc.html?autoconnect=true&resize=scale`,
      cdpUrl: `http://127.0.0.1:${spec.ports.cdp}`,
      owner: sessionOwner(spec.ownerAgentId, spec.ownerLabel),
    };

    const internal: InternalSession = {
      ...handle,
      spec,
      processes: [],
      context: null,
      userDataDir: spec.profileDir,
    };
    this.sessions.set(id, internal);

    try {
      await this.bootSession(internal);
      internal.state = 'running';
      internal.detail = null;
      this.store?.recordStarted(this.toHandle(internal), `http://127.0.0.1:${this.cfg.apiPort}`);
    } catch (err) {
      internal.state = 'failed';
      internal.detail = (err as Error).message;
      this.store?.updateStatus(internal.id, 'failed', new Date().toISOString());
      await this.cleanup(internal);
      this.sessions.delete(id);
      throw err;
    }
    return this.toHandle(internal);
  }

  private async bootSession(session: InternalSession): Promise<void> {
    const { spec } = session;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DISPLAY: spec.ports.display,
    };

    const xvfb = spawnLogged(
      'xvfb-' + spec.slot,
      '/usr/bin/Xvfb',
      [
        spec.ports.display,
        '-screen',
        '0',
        `${spec.viewportWidth}x${spec.viewportHeight}x24`,
        '-nolisten',
        'tcp',
      ],
      env,
    );
    session.processes.push(xvfb);
    await waitForFile(`/tmp/.X11-unix/X${spec.ports.display.replace(':', '')}`, 15_000);

    const x11vnc = spawnLogged(
      'x11vnc-' + spec.slot,
      '/usr/bin/x11vnc',
      [
        '-display',
        spec.ports.display,
        '-forever',
        '-shared',
        '-nopw',
        '-localhost',
        '-rfbport',
        String(spec.ports.vnc),
        '-repeat',
        '-quiet',
      ],
      env,
    );
    session.processes.push(x11vnc);

    const novnc = spawnLogged(
      'novnc-' + spec.slot,
      '/usr/bin/websockify',
      ['--web=/usr/share/novnc', String(spec.ports.novnc), `127.0.0.1:${spec.ports.vnc}`],
      env,
    );
    session.processes.push(novnc);

    const cdpInternal = spec.slot === 'base' ? this.cfg.cdpInternalPort : spec.ports.cdp + 1000;
    const cdpProxy = spawnLogged(
      'cdp-' + spec.slot,
      '/usr/bin/socat',
      [`TCP-LISTEN:${spec.ports.cdp},fork,reuseaddr`, `TCP:127.0.0.1:${cdpInternal}`],
      env,
    );
    session.processes.push(cdpProxy);

    const context = await chromium.launchPersistentContext(session.userDataDir, {
      headless: spec.headless,
      chromiumSandbox: false,
      viewport: null,
      args: [
        `--remote-debugging-port=${cdpInternal}`,
        `--app=${spec.targetUrl}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-session-crashed-bubble',
        '--window-position=0,0',
        `--window-size=${spec.viewportWidth},${spec.viewportHeight}`,
        `--display=${spec.ports.display}`,
      ],
    });
    session.context = context;

    await waitForCdp(spec.ports.cdp, 30_000);
    let primaryPage = context.pages()[0] ?? null;
    context.on('page', (page) => {
      if (!primaryPage) {
        primaryPage = page;
        return;
      }
      if (page !== primaryPage) void page.close().catch(() => undefined);
    });
    context.on('close', () => {
      if (session.state === 'running' || session.state === 'starting') {
        session.state = 'failed';
        session.detail = 'chromium exited unexpectedly';
      }
    });

    const page = primaryPage ?? (await firstPage(context, 10_000));
    primaryPage = page;
    if (page.url() === 'about:blank') {
      await page.goto(spec.targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } else {
      await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
    }
    await Promise.all(
      context
        .pages()
        .filter((p) => p !== page)
        .map((p) => p.close().catch(() => undefined)),
    );
    await page.bringToFront();
  }

  private async cleanup(session: InternalSession): Promise<void> {
    try {
      if (session.context) {
        await session.context.close().catch(() => undefined);
      }
    } finally {
      session.context = null;
    }
    for (const child of session.processes) {
      try {
        child.kill('SIGTERM');
      } catch {
        // already dead
      }
    }
    await sleep(200);
    for (const child of session.processes) {
      try {
        child.kill('SIGKILL');
      } catch {
        // already dead
      }
    }
    session.processes = [];
    if (session.spec.profileMode === 'ephemeral' && session.userDataDir.startsWith('/tmp/')) {
      await rm(session.userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
