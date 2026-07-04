import http from 'node:http';
import { OBSERVER_VERSION } from '@ui-observer/shared';
import type { ObserverConfig } from './config.js';
import type { SharedBrowser } from './browser.js';
import { navigateShared } from './browser.js';
import { collectHealth } from './health.js';

interface ApiState {
  cfg: ObserverConfig;
  getBrowser: () => SharedBrowser | null;
}

function json(res: http.ServerResponse, code: number, data: unknown) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}

export function startApi(state: ApiState): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const route = `${req.method} ${url.pathname}`;
    const browser = state.getBrowser();

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

        case 'POST /navigate': {
          if (!browser || browser.closed()) {
            return json(res, 503, { ok: false, detail: 'browser session not available' });
          }
          const body = await readBody(req);
          let target: string;
          try {
            target = String(JSON.parse(body).url ?? '');
          } catch {
            return json(res, 400, { ok: false, detail: 'expected JSON body: {"url": "..."}' });
          }
          const result = await navigateShared(browser, state.cfg, target);
          return json(res, result.ok ? 200 : 422, result);
        }

        default:
          return json(res, 404, { error: `no route ${route}` });
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
