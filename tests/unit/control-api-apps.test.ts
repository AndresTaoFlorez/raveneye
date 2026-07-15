import type http from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startApi } from '../../apps/observer-server/src/api.js';
import { AppRegistry } from '../../apps/observer-server/src/apps.js';
import type { ObserverConfig } from '../../apps/observer-server/src/config.js';
import type { EvidenceCollector } from '../../apps/observer-server/src/evidence.js';
import {
  SessionLimitError,
  type SessionHandle,
  type SessionManager,
} from '../../apps/observer-server/src/sessions.js';
import type { SettingsStore } from '../../apps/observer-server/src/settings.js';

let tempDir: string | null = null;
let server: http.Server | null = null;
let currentRegistry: AppRegistry | null = null;
let nextApiPort = 18_090;

const collector = {
  getConsole: () => [],
  getNetwork: () => [],
} as unknown as EvidenceCollector;

function cfg(port = 0): ObserverConfig {
  const artifactsDir = tempDir ?? tmpdir();
  return {
    display: ':99',
    targetUrl: 'http://sample-app:3000',
    allowedHosts: [],
    viewportWidth: 1440,
    viewportHeight: 900,
    profileMode: 'ephemeral',
    headless: true,
    apiPort: port,
    cdpInternalPort: 9221,
    novncInternalPort: 6080,
    vncInternalPort: 5900,
    artifactsDir,
    dataDir: join(artifactsDir, 'data'),
    databasePath: join(artifactsDir, 'data', 'raveneye.sqlite'),
    dashboardDir: join(artifactsDir, 'missing-dashboard'),
    docsVaultDir: join(artifactsDir, 'docs-vault'),
    persistentProfileDir: join(artifactsDir, 'profile'),
    maxSessions: 3,
    sessionDisplayStart: 98,
    sessionVncPortStart: 5901,
    sessionNovncPortStart: 6081,
    sessionCdpPortStart: 9223,
  };
}

function handle(overrides: Partial<SessionHandle>): SessionHandle {
  const id = overrides.id ?? 'base-session';
  const slot = overrides.slot ?? 'base';
  const cdp = overrides.ports?.cdp ?? 9222;
  const novnc = overrides.ports?.novnc ?? 6080;
  return {
    id,
    slot,
    appId: overrides.appId ?? 'sample-app',
    state: overrides.state ?? 'running',
    ports: overrides.ports ?? { display: ':99', vnc: 5900, novnc, cdp },
    targetUrl: overrides.targetUrl ?? 'http://sample-app:3000/',
    allowedHosts: overrides.allowedHosts ?? ['sample-app'],
    startedAt: overrides.startedAt ?? new Date().toISOString(),
    stoppedAt: overrides.stoppedAt ?? null,
    detail: overrides.detail ?? null,
    novncUrl:
      overrides.novncUrl ?? `http://127.0.0.1:${novnc}/vnc.html?autoconnect=true&resize=scale`,
    cdpUrl: overrides.cdpUrl ?? `http://127.0.0.1:${cdp}`,
    owner: overrides.owner ?? null,
  };
}

class FakeSessions {
  readonly sessions = new Map<string, SessionHandle>();
  readonly contexts = new Map<
    string,
    { pages: () => unknown[]; newPage: () => Promise<unknown> }
  >();
  navigatedTo = '';

  constructor(private readonly maxDynamic = 3) {
    const base = handle({});
    this.sessions.set(base.id, base);
    this.contexts.set(base.id, this.createContext());
  }

  private createContext() {
    const page = {
      goto: async (url: string) => {
        this.navigatedTo = url;
      },
      bringToFront: async () => {},
      screenshot: async () => {},
      url: () => this.navigatedTo,
    };
    return { pages: () => [page], newPage: async () => page };
  }

  list() {
    return [...this.sessions.values()];
  }

  get(id: string) {
    return this.sessions.get(id) ?? null;
  }

  findRunningForApp(appId: string) {
    return (
      this.list().find((session) => session.appId === appId && session.state === 'running') ?? null
    );
  }

  findRunningForAppOwner(appId: string, agentId: string) {
    return (
      this.list().find(
        (session) =>
          session.appId === appId &&
          session.owner?.agentId === agentId &&
          session.state === 'running',
      ) ?? null
    );
  }

  contextOf(id: string) {
    return this.contexts.get(id) ?? null;
  }

  async startForApp(opts: {
    appId: string;
    targetUrl: string;
    allowedHosts: string[];
    viewportWidth: number;
    viewportHeight: number;
    ownerAgentId?: string | null;
    ownerLabel?: string | null;
  }) {
    const dynamicCount = this.list().filter((session) => session.slot !== 'base').length;
    if (dynamicCount >= this.maxDynamic)
      throw new SessionLimitError('maximum dynamic sessions reached');
    const slot = String(dynamicCount);
    const session = handle({
      id: `sess-${slot}`,
      slot,
      appId: opts.appId,
      targetUrl: new URL(opts.targetUrl).toString(),
      allowedHosts: opts.allowedHosts,
      ports: {
        display: `:${98 - dynamicCount}`,
        vnc: 5901 + dynamicCount * 2,
        novnc: 6081 + dynamicCount * 2,
        cdp: 9223 + dynamicCount,
      },
      owner: opts.ownerAgentId
        ? { agentId: opts.ownerAgentId, label: opts.ownerLabel ?? null }
        : null,
    });
    this.sessions.set(session.id, session);
    this.contexts.set(session.id, this.createContext());
    return session;
  }

  async stop(id: string) {
    const session = this.sessions.get(id);
    if (!session) throw new Error('session not found');
    this.sessions.delete(id);
    return { ...session, state: 'stopped' as const, stoppedAt: new Date().toISOString() };
  }
}

async function startTestApi(fakeSessions = new FakeSessions()) {
  tempDir = await mkdtemp(join(tmpdir(), 'raveneye-api-'));
  const registry = new AppRegistry(join(tempDir, 'raveneye.sqlite'));
  currentRegistry = registry;
  server = startApi({
    cfg: cfg(nextApiPort++),
    collector,
    registry,
    sessions: fakeSessions as unknown as SessionManager,
    baseSessionId: 'base-session',
    settings: {
      value: 10,
      get() {
        return { max_dynamic_sessions: this.value };
      },
      getMaxDynamicSessions() {
        return this.value;
      },
      setMaxDynamicSessions(value: number) {
        this.value = value;
        return this.get();
      },
    } as unknown as SettingsStore,
  });
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('expected tcp server');
  return { baseUrl: `http://127.0.0.1:${address.port}`, registry, sessions: fakeSessions };
}

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = null;
  currentRegistry?.close();
  currentRegistry = null;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe('app registry API', () => {
  it('creates and lists observed apps', async () => {
    const { baseUrl } = await startTestApi();
    const create = await fetch(`${baseUrl}/api/apps`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Sample',
        target_url: 'http://sample-app:3000',
        allowed_hosts: ['sample-app'],
      }),
    });
    expect(create.status).toBe(201);

    const list = await (await fetch(`${baseUrl}/api/apps`)).json();
    expect(list.apps[0].name).toBe('Sample');
  });

  it('rejects unsafe app URLs', async () => {
    const { baseUrl } = await startTestApi();
    const res = await fetch(`${baseUrl}/api/apps`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Bad', target_url: 'file:///etc/passwd', allowed_hosts: [] }),
    });
    expect(res.status).toBe(422);
  });

  it('allows app registration to define the observed host', async () => {
    const { baseUrl } = await startTestApi();
    const res = await fetch(`${baseUrl}/api/apps`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'External',
        target_url: 'https://example.com',
        allowed_hosts: [],
      }),
    });
    expect(res.status).toBe(201);
  });

  it('opens a registered app and returns real session URLs from the backend', async () => {
    const { baseUrl, registry } = await startTestApi();
    const app = registry.create({
      name: 'Host app',
      target_url: 'http://host.docker.internal:5173',
      allowed_hosts: ['host.docker.internal'],
    });

    const res = await fetch(`${baseUrl}/api/apps/${app.id}/open`, { method: 'POST' });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.session.appId).toBe(app.id);
    expect(data.watchUrl).toBe(data.session.novncUrl);
    expect(data.cdpUrl).toBe(data.session.cdpUrl);
  });

  it('does not count the base session against the dynamic session limit', async () => {
    const { baseUrl, registry } = await startTestApi(new FakeSessions(1));
    const app = registry.create({
      name: 'Limited app',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
    });

    const res = await fetch(`${baseUrl}/api/apps/${app.id}/open`, { method: 'POST' });
    expect(res.status).toBe(201);
  });

  it('acquires separate sessions for different agents on the same app', async () => {
    const { baseUrl, registry } = await startTestApi();
    const app = registry.create({
      name: 'Parallel app',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
    });

    const first = await (
      await fetch(`${baseUrl}/api/sessions/acquire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id, agentId: 'codex-a', label: 'first' }),
      })
    ).json();
    const second = await (
      await fetch(`${baseUrl}/api/sessions/acquire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id, agentId: 'codex-b', label: 'second' }),
      })
    ).json();

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(false);
    expect(first.session.id).not.toBe(second.session.id);
    expect(first.session.owner.agentId).toBe('codex-a');
    expect(second.session.owner.agentId).toBe('codex-b');
  });

  it('reuses only the requesting agent owned session', async () => {
    const { baseUrl, registry } = await startTestApi();
    const app = registry.create({
      name: 'Reusable app',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
    });

    const first = await (
      await fetch(`${baseUrl}/api/sessions/acquire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id, agentId: 'codex-a' }),
      })
    ).json();
    const other = await (
      await fetch(`${baseUrl}/api/sessions/acquire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id, agentId: 'codex-b' }),
      })
    ).json();
    const again = await (
      await fetch(`${baseUrl}/api/sessions/acquire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id, agentId: 'codex-a' }),
      })
    ).json();

    expect(again.reused).toBe(true);
    expect(again.session.id).toBe(first.session.id);
    expect(again.session.id).not.toBe(other.session.id);
  });

  it('rejects direct navigation when the target is not in Observed Apps', async () => {
    const { baseUrl, sessions } = await startTestApi();
    const res = await fetch(`${baseUrl}/navigate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'http://sample-app:3000/form' }),
    });

    expect(res.status).toBe(422);
    expect(sessions.navigatedTo).toBe('');
  });

  it('allows direct navigation only within registered observed app hosts', async () => {
    const { baseUrl, registry, sessions } = await startTestApi();
    registry.create({
      name: 'Sample',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
    });

    const res = await fetch(`${baseUrl}/navigate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'http://sample-app:3000/form' }),
    });

    expect(res.status).toBe(200);
    expect(sessions.navigatedTo).toBe('http://sample-app:3000/form');
  });

  it('reports allowed hosts from Observed Apps only', async () => {
    const { baseUrl, registry } = await startTestApi();
    registry.create({
      name: 'Sample',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
    });

    const status = await (await fetch(`${baseUrl}/status`)).json();
    expect(status.allowed_hosts).toEqual(['sample-app']);
    expect(status.sessions[0].cdpUrl).toBe('http://127.0.0.1:9222');
  });

  it('returns 404 for missing sessions', async () => {
    const { baseUrl } = await startTestApi();
    const get = await fetch(`${baseUrl}/api/sessions/missing`);
    const del = await fetch(`${baseUrl}/api/sessions/missing`, { method: 'DELETE' });
    expect(get.status).toBe(404);
    expect(del.status).toBe(404);
  });

  it('reads and updates persisted dashboard settings through the API', async () => {
    const { baseUrl } = await startTestApi();
    const before = await (await fetch(`${baseUrl}/api/settings`)).json();
    expect(before.settings.max_dynamic_sessions).toBe(10);

    const res = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ max_dynamic_sessions: 14 }),
    });
    const after = await res.json();

    expect(res.status).toBe(200);
    expect(after.settings.max_dynamic_sessions).toBe(14);
  });

  it('lists and reads docs from docs-vault', async () => {
    const { baseUrl } = await startTestApi();
    const docsDir = join(tempDir!, 'docs-vault');
    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, 'Index.md'), '# RavenEye Docs\n\nSee [[Guide]].\n', 'utf8');
    await writeFile(join(docsDir, 'Guide.md'), '# Guide\n\nContent.\n', 'utf8');

    const list = await (await fetch(`${baseUrl}/api/docs`)).json();
    expect(list.docs.map((doc: { slug: string }) => doc.slug)).toEqual(['Guide', 'Index']);

    const page = await (await fetch(`${baseUrl}/api/docs/Index`)).json();
    expect(page.doc.content).toContain('[[Guide]]');
  });
});
