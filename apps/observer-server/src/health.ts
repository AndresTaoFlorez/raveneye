import { existsSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import net from 'node:net';
import { join } from 'node:path';
import type { ObserverConfig } from './config.js';
import type { SharedBrowser } from './browser.js';

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

function processRunning(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('pgrep', ['-x', name], (err) => resolve(!err));
  });
}

/**
 * Observer health covers only the observer's own components.
 * The target application is intentionally excluded: a broken target must
 * never make the observer container unhealthy.
 */
export async function collectHealth(
  cfg: ObserverConfig,
  browser: SharedBrowser | null,
): Promise<HealthReport> {
  const displayNum = cfg.display.replace(':', '');
  const components: ComponentHealth[] = [];

  components.push({
    component: 'xvfb',
    ok: existsSync(`/tmp/.X11-unix/X${displayNum}`),
    detail: `X socket /tmp/.X11-unix/X${displayNum}`,
  });

  components.push({
    component: 'window-manager',
    ok: await processRunning('openbox'),
    detail: 'openbox process',
  });

  components.push({
    component: 'x11vnc',
    ok: await tcpCheck(cfg.vncInternalPort),
    detail: `vnc tcp ${cfg.vncInternalPort}`,
  });

  components.push({
    component: 'novnc',
    ok: await tcpCheck(cfg.novncInternalPort),
    detail: `websockify tcp ${cfg.novncInternalPort}`,
  });

  let chromiumOk = false;
  let chromiumDetail = 'no browser session';
  if (browser && !browser.closed()) {
    try {
      const page = browser.context.pages()[0];
      chromiumDetail = page ? `responsive, page: ${page.url()}` : 'responsive, no pages';
      chromiumOk = true;
      if (page) {
        await page.evaluate('1 + 1');
      }
    } catch (err) {
      chromiumOk = false;
      chromiumDetail = `playwright evaluate failed: ${(err as Error).message}`;
    }
  }
  components.push({ component: 'chromium-playwright', ok: chromiumOk, detail: chromiumDetail });

  components.push({
    component: 'cdp',
    ok: await tcpCheck(cfg.cdpInternalPort),
    detail: `chromium devtools tcp ${cfg.cdpInternalPort}`,
  });

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
