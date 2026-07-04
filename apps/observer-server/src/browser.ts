import { chromium, type BrowserContext } from 'playwright';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { evaluateTargetUrl } from '@ui-observer/shared';
import type { ObserverConfig } from './config.js';

export interface SharedBrowser {
  context: BrowserContext;
  userDataDir: string;
  /** True once the context has emitted `close` (crash or manual exit). */
  closed: () => boolean;
}

/**
 * Launch the single shared, visible Chromium session on the virtual display.
 * Chromium exposes CDP on a loopback port; a socat sidecar (supervisord)
 * republishes it on the container interface so host-side agents can attach.
 */
export async function launchSharedBrowser(cfg: ObserverConfig): Promise<SharedBrowser> {
  const userDataDir =
    cfg.profileMode === 'persistent'
      ? cfg.persistentProfileDir
      : await mkdtemp('/tmp/ui-observer-profile-');
  if (cfg.profileMode === 'persistent') {
    await mkdir(userDataDir, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: cfg.headless,
    // The Chromium sandbox needs privileges we deliberately do not grant the
    // container (no-new-privileges, non-root). Container isolation is the boundary.
    chromiumSandbox: false,
    viewport: null,
    args: [
      `--remote-debugging-port=${cfg.cdpInternalPort}`,
      `--window-position=0,0`,
      `--window-size=${cfg.viewportWidth},${cfg.viewportHeight}`,
    ],
  });

  let isClosed = false;
  context.on('close', () => {
    isClosed = true;
  });

  return { context, userDataDir, closed: () => isClosed };
}

/** Navigate the first page of the shared context, enforcing the URL policy. */
export async function navigateShared(
  browser: SharedBrowser,
  cfg: ObserverConfig,
  rawUrl: string,
): Promise<{ ok: boolean; detail: string }> {
  const decision = evaluateTargetUrl(rawUrl, { allowedHosts: cfg.allowedHosts });
  if (!decision.allowed) {
    return { ok: false, detail: decision.reason };
  }
  const page = browser.context.pages()[0] ?? (await browser.context.newPage());
  try {
    await page.goto(decision.url.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return { ok: true, detail: `navigated to ${decision.url}` };
  } catch (err) {
    return { ok: false, detail: `navigation failed: ${(err as Error).message}` };
  }
}

export async function cleanupEphemeralProfile(browser: SharedBrowser, cfg: ObserverConfig) {
  if (cfg.profileMode === 'ephemeral' && browser.userDataDir.startsWith('/tmp/')) {
    await rm(browser.userDataDir, { recursive: true, force: true });
  }
}
