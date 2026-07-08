import http from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { OBSERVER_VERSION, evaluateTargetUrl, isNetworkProblem, mergeAllowedHosts } from '@raveneye/shared';
import type { ObserverConfig } from './config.js';
import {
  SessionAlreadyRunningError,
  SessionLimitError,
  SessionManager,
  SessionNotFoundError,
  type SessionHandle,
} from './sessions.js';
import { collectHealth } from './health.js';
import type { EvidenceCollector } from './evidence.js';
import { AppRegistry, ValidationError, normalizeAllowedHosts, type ObservedApp } from './apps.js';
import { listRuns, readRun } from './runs.js';
import { listDocs, readDoc } from './docs.js';
import type { SettingsStore } from './settings.js';

interface ApiState {
  cfg: ObserverConfig;
  registry: AppRegistry;
  sessions: SessionManager;
  collector: EvidenceCollector;
  baseSessionId: string;
  settings: SettingsStore;
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
  return String(name ?? fallback).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || fallback;
}

function assertAppUrlAllowed(body: Record<string, unknown>, existing?: ObservedApp) {
  const targetUrl = body.target_url === undefined && existing ? existing.target_url : body.target_url;
  if (typeof targetUrl !== 'string') throw new ValidationError('target_url is required');
  const appHosts =
    body.allowed_hosts === undefined && existing ? existing.allowed_hosts : normalizeAllowedHosts(body.allowed_hosts);
  let targetHost: string;
  try {
    targetHost = new URL(targetUrl).hostname;
  } catch {
    throw new ValidationError('target_url must be a valid absolute URL');
  }
  const decision = evaluateTargetUrl(targetUrl, {
    allowedHosts: mergeAllowedHosts([targetHost], appHosts),
  });
  if (!decision.allowed) throw new ValidationError(decision.reason);
}

function appNavigationHosts(app: ObservedApp): string[] {
  return mergeAllowedHosts([new URL(app.target_url).hostname], app.allowed_hosts);
}

function registryNavigationHosts(cfg: ObserverConfig, registry: AppRegistry): string[] {
  return mergeAllowedHosts(cfg.allowedHosts, ...registry.list().map(appNavigationHosts));
}

function html(res: http.ServerResponse, code: number, data: string) {
  res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' });
  res.end(data);
}

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
};

const DASHBOARD_ROUTES = new Set(['/', '/overview', '/sessions', '/mission-runs', '/settings', '/docs']);

async function serveDashboard(cfg: ObserverConfig, reqPath: string, res: http.ServerResponse): Promise<boolean> {
  if (
    !DASHBOARD_ROUTES.has(reqPath) &&
    !reqPath.startsWith('/docs/') &&
    !reqPath.startsWith('/dashboard') &&
    !reqPath.startsWith('/assets/')
  ) return false;
  const relative =
    DASHBOARD_ROUTES.has(reqPath) || reqPath.startsWith('/docs/') || reqPath === '/dashboard' || reqPath === '/dashboard/'
      ? 'index.html'
      : reqPath.replace(/^\/dashboard\/?/, '').replace(/^\//, '');
  const root = normalize(cfg.dashboardDir);
  const file = normalize(join(root, relative));
  if (!file.startsWith(root)) {
    json(res, 403, { error: 'invalid dashboard path' });
    return true;
  }
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    if (relative === 'index.html') {
      html(
        res,
        200,
        '<!doctype html><title>RavenEye Dashboard</title><h1>RavenEye Dashboard</h1><p>Dashboard assets are not built yet.</p>',
      );
    } else {
      json(res, 404, { error: 'dashboard asset not found' });
    }
  }
  return true;
}

export function startApi(state: ApiState): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const route = `${req.method} ${url.pathname}`;

    const baseSession = state.sessions.get(state.baseSessionId);

    try {
      if (await serveDashboard(state.cfg, url.pathname, res)) return;

      if (route === 'GET /api/apps') {
        const apps = state.registry.list();
        const sessions = state.sessions.list();
        const byApp = new Map<string, SessionHandle[]>();
        for (const session of sessions) {
          const list = byApp.get(session.appId) ?? [];
          list.push(session);
          byApp.set(session.appId, list);
        }
        return json(res, 200, {
          apps: apps.map((app) => ({
            ...app,
            sessions: byApp.get(app.id) ?? [],
          })),
        });
      }

      if (route === 'GET /api/settings') {
        return json(res, 200, { settings: state.settings.get() });
      }

      if (route === 'PATCH /api/settings') {
        const body = await readJsonBody(req).catch(() => null);
        if (!body) return json(res, 400, { ok: false, detail: 'invalid JSON body' });
        if (body.max_dynamic_sessions !== undefined) {
          const value = Number(body.max_dynamic_sessions);
          if (!Number.isInteger(value) || value < 1 || value > 50) {
            return json(res, 422, {
              ok: false,
              detail: 'max_dynamic_sessions must be an integer between 1 and 50',
            });
          }
          return json(res, 200, { settings: state.settings.setMaxDynamicSessions(value) });
        }
        return json(res, 422, { ok: false, detail: 'no supported settings provided' });
      }

      if (route === 'POST /api/apps') {
        const body = await readJsonBody(req).catch(() => null);
        if (!body) return json(res, 400, { ok: false, detail: 'invalid JSON body' });
        assertAppUrlAllowed(body);
        const app = state.registry.create(body);
        return json(res, 201, { app });
      }

      const appMatch = url.pathname.match(/^\/api\/apps\/([^/]+)$/);
      if (appMatch && req.method === 'GET') {
        const app = state.registry.get(decodeURIComponent(appMatch[1]!));
        if (!app) return json(res, 404, { ok: false, detail: 'app not found' });
        return json(res, 200, { app, sessions: state.sessions.list().filter((s) => s.appId === app.id) });
      }

      if (appMatch && req.method === 'PATCH') {
        const body = await readJsonBody(req).catch(() => null);
        if (!body) return json(res, 400, { ok: false, detail: 'invalid JSON body' });
        const id = decodeURIComponent(appMatch[1]!);
        const existing = state.registry.get(id);
        if (!existing) return json(res, 404, { ok: false, detail: 'app not found' });
        assertAppUrlAllowed(body, existing);
        const app = state.registry.update(id, body);
        return app ? json(res, 200, { app }) : json(res, 404, { ok: false, detail: 'app not found' });
      }

      if (appMatch && req.method === 'DELETE') {
        const deleted = state.registry.delete(decodeURIComponent(appMatch[1]!));
        return json(res, deleted ? 200 : 404, { ok: deleted, detail: deleted ? 'deleted' : 'app not found' });
      }

      const openMatch = url.pathname.match(/^\/api\/apps\/([^/]+)\/open$/);
      if (openMatch && req.method === 'POST') {
        const app = state.registry.get(decodeURIComponent(openMatch[1]!));
        if (!app) return json(res, 404, { ok: false, detail: 'app not found' });
        const running = state.sessions.findRunningForApp(app.id);
        if (running) {
          // Reuse the existing session: just navigate it to the app URL.
          const context = state.sessions.contextOf(running.id);
          if (!context) return json(res, 503, { ok: false, detail: 'session has no live context' });
          const page = context.pages()[0] ?? (await context.newPage());
          await page.goto(app.target_url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          await page.bringToFront();
          return json(res, 200, {
            ok: true,
            detail: 'navigated existing session',
            app,
            session: running,
            watchUrl: running.novncUrl,
            cdpUrl: running.cdpUrl,
          });
        }
        try {
          const session = await state.sessions.startForApp({
            appId: app.id,
            targetUrl: app.target_url,
            allowedHosts: mergeAllowedHosts(state.cfg.allowedHosts, appNavigationHosts(app)),
            viewportWidth: app.default_viewport_width,
            viewportHeight: app.default_viewport_height,
          });
          return json(res, 201, {
            ok: true,
            detail: 'session started',
            app,
            session,
            watchUrl: session.novncUrl,
            cdpUrl: session.cdpUrl,
          });
        } catch (err) {
          if (err instanceof SessionAlreadyRunningError) {
            return json(res, 409, { ok: false, detail: err.message });
          }
          if (err instanceof SessionLimitError) {
            return json(res, 429, { ok: false, detail: err.message });
          }
          throw err;
        }
      }

      const stopMatch = url.pathname.match(/^\/api\/apps\/([^/]+)\/session$/);
      if (stopMatch && req.method === 'DELETE') {
        const appId = decodeURIComponent(stopMatch[1]!);
        const running = state.sessions.findRunningForApp(appId);
        if (!running) return json(res, 404, { ok: false, detail: 'no running session for this app' });
        const stopped = await state.sessions.stop(running.id);
        return json(res, 200, { ok: true, session: stopped });
      }

      if (route === 'GET /api/sessions') {
        return json(res, 200, { sessions: state.sessions.list() });
      }

      const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
      if (sessionMatch && req.method === 'GET') {
        const session = state.sessions.get(decodeURIComponent(sessionMatch[1]!));
        return session ? json(res, 200, { session }) : json(res, 404, { ok: false, detail: 'session not found' });
      }
      if (sessionMatch && req.method === 'DELETE') {
        const session = state.sessions.get(decodeURIComponent(sessionMatch[1]!));
        if (!session) return json(res, 404, { ok: false, detail: 'session not found' });
        const stopped = await state.sessions.stop(session.id);
        return json(res, 200, { ok: true, session: stopped });
      }

      if (route === 'GET /api/runs') {
        return json(res, 200, { runs: await listRuns(state.cfg.artifactsDir) });
      }

      if (route === 'GET /api/docs') {
        return json(res, 200, { docs: await listDocs(state.cfg.docsVaultDir) });
      }

      const docMatch = url.pathname.match(/^\/api\/docs\/(.+)$/);
      if (docMatch && req.method === 'GET') {
        const doc = await readDoc(state.cfg.docsVaultDir, decodeURIComponent(docMatch[1]!));
        return doc ? json(res, 200, { doc }) : json(res, 404, { ok: false, detail: 'doc not found' });
      }

      const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
      if (runMatch && req.method === 'GET') {
        const run = await readRun(state.cfg.artifactsDir, decodeURIComponent(runMatch[1]!));
        if (!run) return json(res, 404, { ok: false, detail: 'run not found' });
        const report =
          url.searchParams.get('include_report') === '1' && run.report_path
            ? await readFile(run.report_path, 'utf8').catch(() => null)
            : null;
        return json(res, 200, { run, report });
      }

      switch (route) {
        case 'GET /health': {
          const report = await collectHealth(state.cfg, state.sessions.list());
          return json(res, report.status === 'ok' ? 200 : 503, report);
        }

        case 'GET /status': {
          const sessions = state.sessions.list();
          return json(res, 200, {
            observer_version: OBSERVER_VERSION,
            profile_mode: state.cfg.profileMode,
            target_url: state.cfg.targetUrl,
            allowed_hosts: registryNavigationHosts(state.cfg, state.registry),
            viewport: { width: state.cfg.viewportWidth, height: state.cfg.viewportHeight },
            sessions: sessions.map((s) => ({
              id: s.id,
              slot: s.slot,
              appId: s.appId,
              state: s.state,
              ports: s.ports,
              targetUrl: s.targetUrl,
              novncUrl: s.novncUrl,
              cdpUrl: s.cdpUrl,
              startedAt: s.startedAt,
              stoppedAt: s.stoppedAt,
            })),
          });
        }

        case 'GET /cdp-info': {
          const sessions = state.sessions.list();
          return json(res, 200, {
            host_endpoint: 'http://127.0.0.1:9222 (loopback publish of container port 9222)',
            sessions: sessions.map((s) => ({ id: s.id, slot: s.slot, cdp: s.cdpUrl, appId: s.appId })),
          });
        }

        case 'POST /navigate': {
          if (!baseSession) return json(res, 503, { ok: false, detail: 'base session unavailable' });
          const body = await readJsonBody(req).catch(() => null);
          if (!body || typeof body.url !== 'string') {
            return json(res, 400, { ok: false, detail: 'expected JSON body: {"url": "..."}' });
          }
          const decision = evaluateTargetUrl(body.url, { allowedHosts: registryNavigationHosts(state.cfg, state.registry) });
          if (!decision.allowed) return json(res, 422, { ok: false, detail: decision.reason });
          const context = state.sessions.contextOf(baseSession.id);
          if (!context) return json(res, 503, { ok: false, detail: 'base session has no live context' });
          const page = context.pages()[0] ?? (await context.newPage());
          try {
            await page.goto(decision.url.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
            return json(res, 200, { ok: true, detail: `navigated to ${decision.url}` });
          } catch (err) {
            return json(res, 500, { ok: false, detail: `navigation failed: ${(err as Error).message}` });
          }
        }

        case 'POST /screenshot': {
          if (!baseSession) return json(res, 503, { ok: false, detail: 'base session unavailable' });
          const body: Record<string, unknown> = await readJsonBody(req).catch(() => ({}));
          const context = state.sessions.contextOf(baseSession.id);
          if (!context) return json(res, 503, { ok: false, detail: 'base session has no live context' });
          const pages = context.pages();
          const page = pages[pages.length - 1];
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
              'GET /',
              'GET /health',
              'GET /status',
              'GET /cdp-info',
              'POST /navigate {"url"}',
              'POST /screenshot {"name?","full_page?"}',
              'GET /console?clear=1',
              'GET /network?problems=1&clear=1',
              'GET /api/apps',
              'GET/PATCH /api/settings',
              'POST /api/apps',
              'GET/PATCH/DELETE /api/apps/:id',
              'POST /api/apps/:id/open',
              'DELETE /api/apps/:id/session',
              'GET /api/sessions',
              'GET/DELETE /api/sessions/:id',
              'GET /api/runs',
              'GET /api/runs/:runId',
              'GET /api/docs',
              'GET /api/docs/:slug',
            ],
          });
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        return json(res, 422, { ok: false, detail: err.message });
      }
      if (err instanceof SessionNotFoundError) {
        return json(res, 404, { ok: false, detail: err.message });
      }
      return json(res, 500, { error: (err as Error).message });
    }
  });

  server.listen(state.cfg.apiPort, '0.0.0.0', () => {
    console.log(`[observer] control api listening on :${state.cfg.apiPort}`);
  });
  return server;
}
