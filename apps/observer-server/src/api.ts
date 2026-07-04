import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { OBSERVER_VERSION, isNetworkProblem } from '@ui-observer/shared';
import type { ObserverConfig } from './config.js';
import type { SharedBrowser } from './browser.js';
import { navigateShared } from './browser.js';
import { collectHealth } from './health.js';
import type { EvidenceCollector } from './evidence.js';

interface ApiState {
  cfg: ObserverConfig;
  getBrowser: () => SharedBrowser | null;
  collector: EvidenceCollector;
}

function json(res: http.ServerResponse, code: number, data: unknown) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  let body = '';
  for await (const chunk of req) body += chunk;
  if (!body.trim()) return {};
  return JSON.parse(body) as Record<string, unknown>;
}

function sanitizeName(name: unknown, fallback: string): string {
  const s = String(name ?? fallback).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60);
  return s || fallback;
}

export function startApi(state: ApiState): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const route = `${req.method} ${url.pathname}`;
    const browser = state.getBrowser();
    const needBrowser = () => {
      if (!browser || browser.closed()) {
        json(res, 503, { ok: false, detail: 'browser session not available' });
        return false;
      }
      return true;
    };

    try {
      switch (route) {
        case 'GET /health': {
          const report = await collectHealth(state.cfg, browser);
          return json(res, report.status === 'ok' ? 200 : 503, report);
        }

        case 'GET /status': {
          return json(res, 200, {
            observer_version: OBSERVER_VERSION,
            profile_mode: state.cfg.profileMode,
            target_url: state.cfg.targetUrl,
            allowed_hosts: state.cfg.allowedHosts,
            viewport: { width: state.cfg.viewportWidth, height: state.cfg.viewportHeight },
            pages: browser && !browser.closed() ? browser.context.pages().map((p) => p.url()) : [],
          });
        }

        case 'GET /cdp-info': {
          return json(res, 200, {
            host_endpoint: 'http://127.0.0.1:9222 (loopback publish of container port 9222)',
            note: 'connect with playwright: chromium.connectOverCDP("http://127.0.0.1:9222")',
          });
        }

        case 'POST /navigate': {
          if (!needBrowser()) return;
          const body = await readJsonBody(req).catch(() => null);
          if (!body || typeof body.url !== 'string') {
            return json(res, 400, { ok: false, detail: 'expected JSON body: {"url": "..."}' });
          }
          const result = await navigateShared(browser!, state.cfg, body.url);
          return json(res, result.ok ? 200 : 422, result);
        }

        case 'POST /screenshot': {
          if (!needBrowser()) return;
          const body: Record<string, unknown> = await readJsonBody(req).catch(() => ({}));
          const page = browser!.context.pages()[0];
          if (!page) return json(res, 409, { ok: false, detail: 'no open page' });
          const dir = join(state.cfg.artifactsDir, 'screenshots');
          await mkdir(dir, { recursive: true });
          const name = sanitizeName(body.name, 'capture');
          const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${name}.png`);
          await page.screenshot({ path: file, fullPage: body.full_page === true });
          return json(res, 200, { ok: true, path: file, page_url: page.url() });
        }

        case 'GET /console': {
          const entries = state.collector.getConsole(url.searchParams.get('clear') === '1');
          return json(res, 200, { count: entries.length, entries });
        }

        case 'GET /network': {
          let entries = state.collector.getNetwork(url.searchParams.get('clear') === '1');
          if (url.searchParams.get('problems') === '1') {
            entries = entries.filter(isNetworkProblem);
          }
          return json(res, 200, { count: entries.length, entries });
        }

        default:
          return json(res, 404, {
            error: `no route ${route}`,
            routes: [
              'GET /health',
              'GET /status',
              'GET /cdp-info',
              'POST /navigate {"url"}',
              'POST /screenshot {"name?","full_page?"}',
              'GET /console?clear=1',
              'GET /network?problems=1&clear=1',
            ],
          });
      }
    } catch (err) {
      return json(res, 500, { error: (err as Error).message });
    }
  });

  server.listen(state.cfg.apiPort, '0.0.0.0', () => {
    console.log(`[observer] control api listening on :${state.cfg.apiPort}`);
  });
  return server;
}
