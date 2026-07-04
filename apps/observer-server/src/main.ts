import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadConfig } from './config.js';
import { launchSharedBrowser, navigateShared, cleanupEphemeralProfile } from './browser.js';
import type { SharedBrowser } from './browser.js';
import { startApi } from './api.js';

const cfg = loadConfig();
let browser: SharedBrowser | null = null;

async function waitForDisplay(timeoutMs = 30_000) {
  const socket = `/tmp/.X11-unix/X${cfg.display.replace(':', '')}`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(socket)) return;
    await sleep(250);
  }
  throw new Error(`X display ${cfg.display} did not appear within ${timeoutMs}ms (${socket})`);
}

async function main() {
  console.log(`[observer] starting; profile=${cfg.profileMode} headless=${cfg.headless}`);
  if (!cfg.headless) {
    await waitForDisplay();
    console.log(`[observer] display ${cfg.display} is up`);
  }

  browser = await launchSharedBrowser(cfg);
  console.log(`[observer] chromium launched (profile dir: ${browser.userDataDir})`);

  startApi({ cfg, getBrowser: () => browser });

  // Opening the target is best-effort: a broken target application must not
  // bring the observer down or mark it unhealthy.
  const nav = await navigateShared(browser, cfg, cfg.targetUrl);
  console.log(`[observer] initial navigation: ${nav.ok ? 'ok' : 'FAILED'} — ${nav.detail}`);

  // If the browser dies (crash, or a human closes the window through noVNC),
  // exit non-zero so supervisord relaunches a fresh session.
  const watchdog = setInterval(() => {
    if (browser?.closed()) {
      console.error('[observer] browser session closed; exiting for supervisor restart');
      process.exit(1);
    }
  }, 2000);
  watchdog.unref();

  const shutdown = async (signal: string) => {
    console.log(`[observer] ${signal} received; shutting down`);
    try {
      if (browser && !browser.closed()) await browser.context.close();
      if (browser) await cleanupEphemeralProfile(browser, cfg);
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[observer] fatal:', err);
  process.exit(1);
});
