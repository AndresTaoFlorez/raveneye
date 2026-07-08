import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { AppRegistry, validateObservedAppInput } from '../../apps/observer-server/src/apps.js';
import { SessionStore, type SessionHandle } from '../../apps/observer-server/src/sessions.js';
import { SettingsStore } from '../../apps/observer-server/src/settings.js';

let tempDir: string | null = null;

async function createRegistry() {
  tempDir = await mkdtemp(join(tmpdir(), 'raveneye-apps-'));
  return new AppRegistry(join(tempDir, 'raveneye.sqlite'));
}

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe('validateObservedAppInput', () => {
  it('normalizes allowed hosts and defaults viewport/run mode', () => {
    const app = validateObservedAppInput({
      name: 'Local app',
      target_url: 'http://host.docker.internal:5173',
      allowed_hosts: 'HOST.docker.internal, localhost, localhost',
    });
    expect(app.allowed_hosts).toEqual(['host.docker.internal', 'localhost']);
    expect(app.run_mode).toBe('host');
    expect(app.default_viewport_width).toBe(1440);
  });

  it.each(['file:///tmp/index.html', 'javascript:alert(1)', 'data:text/html,x'])(
    'rejects unsafe scheme %s',
    (targetUrl) => {
      expect(() =>
        validateObservedAppInput({
          name: 'Bad app',
          target_url: targetUrl,
          allowed_hosts: ['localhost'],
        }),
      ).toThrow(/scheme|valid absolute URL/);
    },
  );
});

describe('AppRegistry', () => {
  it('creates, lists, updates and deletes observed apps', async () => {
    const registry = await createRegistry();
    const created = registry.create({
      name: 'Sample',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
    });
    expect(registry.list()).toHaveLength(1);

    const updated = registry.update(created.id, {
      name: 'Sample app',
      description: 'Updated',
    });
    expect(updated?.name).toBe('Sample app');
    expect(updated?.target_url).toBe('http://sample-app:3000');

    expect(registry.delete(created.id)).toBe(true);
    expect(registry.list()).toEqual([]);
    registry.close();
  });

  it('does not allow changing a registered app target URL', async () => {
    const registry = await createRegistry();
    const created = registry.create({
      name: 'Locked',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
    });

    expect(() =>
      registry.update(created.id, {
        name: 'Locked',
        target_url: 'http://localhost:3000',
      }),
    ).toThrow(/target_url cannot be changed/);
    registry.close();
  });

  it('persists apps on disk', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'raveneye-apps-'));
    const dbPath = join(tempDir, 'raveneye.sqlite');
    const first = new AppRegistry(dbPath);
    first.create({ name: 'Persistent', target_url: 'http://localhost:3000', allowed_hosts: ['localhost'] });
    first.close();

    const second = new AppRegistry(dbPath);
    expect(second.list()[0]?.name).toBe('Persistent');
    second.close();
  });

  it('seeds the bundled sample app with a stable id once', async () => {
    const registry = await createRegistry();
    const first = registry.ensureSeedApp({
      id: 'sample-app',
      name: 'Sample App',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
      run_mode: 'container',
    });
    const second = registry.ensureSeedApp({
      id: 'sample-app',
      name: 'Changed',
      target_url: 'http://sample-app:3000',
      allowed_hosts: ['sample-app'],
    });

    expect(first.id).toBe('sample-app');
    expect(second.name).toBe('Sample App');
    expect(registry.list()).toHaveLength(1);
    registry.close();
  });
});

describe('SessionStore', () => {
  it('persists observer session lifecycle rows in SQLite', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'raveneye-sessions-'));
    const dbPath = join(tempDir, 'raveneye.sqlite');
    const store = new SessionStore(dbPath);
    const session: SessionHandle = {
      id: 'sess-0',
      slot: '0',
      appId: 'sample-app',
      state: 'running',
      ports: { display: ':98', vnc: 5901, novnc: 6081, cdp: 9223 },
      targetUrl: 'http://sample-app:3000/',
      allowedHosts: ['sample-app'],
      startedAt: '2026-07-08T10:00:00.000Z',
      stoppedAt: null,
      detail: null,
      novncUrl: 'http://127.0.0.1:6081/vnc.html?autoconnect=true&resize=scale',
      cdpUrl: 'http://127.0.0.1:9223',
    };

    store.recordStarted(session, 'http://127.0.0.1:8090');
    expect(store.get('sess-0')?.novnc_url).toBe(session.novncUrl);
    store.updateStatus('sess-0', 'stopped', '2026-07-08T10:10:00.000Z');
    expect(store.list()[0]).toMatchObject({ id: 'sess-0', status: 'stopped' });
    store.close();
  });
});

describe('SettingsStore', () => {
  it('persists max dynamic sessions with a default of 10', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'raveneye-settings-'));
    const dbPath = join(tempDir, 'raveneye.sqlite');
    const first = new SettingsStore(dbPath, { max_dynamic_sessions: 10 });

    expect(first.getMaxDynamicSessions()).toBe(10);
    first.setMaxDynamicSessions(12);
    first.close();

    const second = new SettingsStore(dbPath, { max_dynamic_sessions: 10 });
    expect(second.get().max_dynamic_sessions).toBe(12);
    second.close();
  });
});
