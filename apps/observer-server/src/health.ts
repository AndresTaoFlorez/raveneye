import { existsSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import net from 'node:net';
import { join } from 'node:path';
import type { ObserverConfig } from './config.js';
import type { SessionHandle } from './sessions.js';

export interface ComponentHealth {
  component: string;
  ok: boolean;
  detail: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  checked_at: string;
  components: ComponentHealth[];
}

function tcpCheck(port: number, host = '127.0.0.1', timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
  });
}

function sessionComponent(prefix: string, session: SessionHandle, key: string, ok: boolean, detail: string): ComponentHealth {
  return { component: `${prefix}:${session.slot}:${key}`, ok, detail };
}

async function checkSessionComponents(session: SessionHandle): Promise<ComponentHealth[]> {
  const components: ComponentHealth[] = [];
  const displayNum = session.ports.display.replace(':', '');
  components.push(
    sessionComponent('session', session, 'xvfb', existsSync(`/tmp/.X11-unix/X${displayNum}`), `display ${session.ports.display}`),
  );
  components.push(
    sessionComponent('session', session, 'x11vnc', await tcpCheck(session.ports.vnc), `vnc tcp ${session.ports.vnc}`),
  );
  components.push(
    sessionComponent('session', session, 'novnc', await tcpCheck(session.ports.novnc), `websockify tcp ${session.ports.novnc}`),
  );
  components.push(
    sessionComponent('session', session, 'cdp', await tcpCheck(session.ports.cdp), `chromium devtools tcp ${session.ports.cdp}`),
  );
  components.push(
    sessionComponent(
      'session',
      session,
      'chromium',
      session.state === 'running',
      session.state === 'running'
        ? `running, app=${session.appId}, target=${session.targetUrl}`
        : `${session.state}${session.detail ? `: ${session.detail}` : ''}`,
    ),
  );
  return components;
}

/**
 * Observer health covers only the observer's own components.
 * The target application is intentionally excluded: a broken target must
 * never make the observer container unhealthy.
 */
export async function collectHealth(cfg: ObserverConfig, sessions: SessionHandle[]): Promise<HealthReport> {
  const components: ComponentHealth[] = [];
  for (const session of sessions) {
    components.push(...(await checkSessionComponents(session)));
  }
  let artifactsOk = false;
  let artifactsDetail = cfg.artifactsDir;
  try {
    const probe = join(cfg.artifactsDir, `.health-probe-${process.pid}`);
    await writeFile(probe, 'ok');
    await unlink(probe);
    artifactsOk = true;
  } catch (err) {
    artifactsDetail = `not writable: ${(err as Error).message}`;
  }
  components.push({ component: 'artifacts-dir', ok: artifactsOk, detail: artifactsDetail });
  return {
    status: components.every((c) => c.ok) ? 'ok' : 'degraded',
    checked_at: new Date().toISOString(),
    components,
  };
}
