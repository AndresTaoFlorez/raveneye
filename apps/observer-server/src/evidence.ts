import type { BrowserContext, Page, Request } from 'playwright';
import {
  redactHeaders,
  redactUrl,
  redactText,
  type ConsoleEntry,
  type NetworkEntry,
} from '@raveneye/shared';

const MAX_ENTRIES = 2000;

/**
 * Attaches to the shared context and keeps ring buffers of console output,
 * page errors and network activity so agents can inspect what happened
 * without having been connected at the time.
 */
export class EvidenceCollector {
  private console: ConsoleEntry[] = [];
  private network: NetworkEntry[] = [];
  private started = new WeakMap<Request, number>();

  attach(context: BrowserContext) {
    context.pages().forEach((p) => this.attachPage(p));
    context.on('page', (p) => this.attachPage(p));

    context.on('request', (req) => {
      this.started.set(req, Date.now());
    });

    context.on('requestfinished', async (req) => {
      const res = await req.response();
      this.pushNetwork({
        ts: new Date().toISOString(),
        method: req.method(),
        url: redactUrl(req.url()),
        resource_type: req.resourceType(),
        status: res?.status(),
        ok: res ? res.status() < 400 : undefined,
        duration_ms: this.duration(req),
        request_headers: redactHeaders(await req.allHeaders().catch(() => ({}))),
        response_headers: res ? redactHeaders(await res.allHeaders().catch(() => ({}))) : undefined,
      });
    });

    context.on('requestfailed', (req) => {
      this.pushNetwork({
        ts: new Date().toISOString(),
        method: req.method(),
        url: redactUrl(req.url()),
        resource_type: req.resourceType(),
        failure: req.failure()?.errorText ?? 'unknown failure',
        duration_ms: this.duration(req),
      });
    });
  }

  private attachPage(page: Page) {
    page.on('console', (msg) => {
      this.pushConsole({
        ts: new Date().toISOString(),
        kind: 'console',
        level: msg.type(),
        text: redactText(msg.text()),
        page_url: page.url(),
        location: msg.location()
          ? `${msg.location().url}:${msg.location().lineNumber}`
          : undefined,
      });
    });
    page.on('pageerror', (err) => {
      this.pushConsole({
        ts: new Date().toISOString(),
        kind: 'page-error',
        level: 'error',
        text: redactText(err.message),
        page_url: page.url(),
      });
    });
  }

  private duration(req: Request): number | undefined {
    const t0 = this.started.get(req);
    return t0 ? Date.now() - t0 : undefined;
  }

  private pushConsole(entry: ConsoleEntry) {
    this.console.push(entry);
    if (this.console.length > MAX_ENTRIES) this.console.shift();
  }

  private pushNetwork(entry: NetworkEntry) {
    this.network.push(entry);
    if (this.network.length > MAX_ENTRIES) this.network.shift();
  }

  getConsole(clear = false): ConsoleEntry[] {
    const out = [...this.console];
    if (clear) this.console = [];
    return out;
  }

  getNetwork(clear = false): NetworkEntry[] {
    const out = [...this.network];
    if (clear) this.network = [];
    return out;
  }
}
