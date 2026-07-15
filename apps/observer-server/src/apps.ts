import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { evaluateTargetUrl } from '@raveneye/shared';

export type RunMode = 'host' | 'container';

export interface ObservedApp {
  id: string;
  name: string;
  description: string | null;
  target_url: string;
  allowed_hosts: string[];
  local_repo_path: string | null;
  run_mode: RunMode;
  default_viewport_width: number;
  default_viewport_height: number;
  created_at: string;
  updated_at: string;
}

export interface ObservedAppInput {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  target_url?: unknown;
  allowed_hosts?: unknown;
  local_repo_path?: unknown;
  run_mode?: unknown;
  default_viewport_width?: unknown;
  default_viewport_height?: unknown;
}

interface ObservedAppRow {
  id: string;
  name: string;
  description: string | null;
  target_url: string;
  allowed_hosts_json: string;
  local_repo_path: string | null;
  run_mode: string;
  default_viewport_width: number;
  default_viewport_height: number;
  created_at: string;
  updated_at: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new ValidationError('expected a string value');
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function integerValue(value: unknown, field: string, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 240 || n > 10000) {
    throw new ValidationError(`${field} must be an integer between 240 and 10000`);
  }
  return n;
}

export function normalizeAllowedHosts(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  const raw =
    typeof value === 'string'
      ? value.split(',')
      : Array.isArray(value)
        ? value
        : (() => {
            throw new ValidationError('allowed_hosts must be an array or comma-separated string');
          })();
  const seen = new Set<string>();
  const hosts: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string')
      throw new ValidationError('allowed_hosts entries must be strings');
    const host = entry.trim().toLowerCase();
    if (!host || seen.has(host)) continue;
    seen.add(host);
    hosts.push(host);
  }
  return hosts;
}

function normalizeRunMode(value: unknown): RunMode {
  if (value === undefined || value === null || value === '') return 'host';
  if (value === 'host' || value === 'container') return value;
  throw new ValidationError('run_mode must be "host" or "container"');
}

export function validateObservedAppInput(
  input: ObservedAppInput,
  existing?: ObservedApp,
): ObservedApp {
  const now = new Date().toISOString();
  if (
    existing &&
    input.target_url !== undefined &&
    requiredString(input.target_url, 'target_url') !== existing.target_url
  ) {
    throw new ValidationError('target_url cannot be changed after an app is registered');
  }
  let targetHost: string;
  try {
    targetHost = new URL(
      input.target_url === undefined && existing
        ? existing.target_url
        : requiredString(input.target_url, 'target_url'),
    ).hostname;
  } catch {
    throw new ValidationError('target_url must be a valid absolute URL');
  }
  const app: ObservedApp = {
    id: existing?.id ?? optionalId(input.id) ?? randomUUID(),
    name: input.name === undefined && existing ? existing.name : requiredString(input.name, 'name'),
    description:
      input.description === undefined && existing
        ? existing.description
        : optionalString(input.description),
    target_url:
      input.target_url === undefined && existing
        ? existing.target_url
        : requiredString(input.target_url, 'target_url'),
    allowed_hosts:
      input.allowed_hosts === undefined && existing
        ? existing.allowed_hosts
        : normalizeAllowedHosts(input.allowed_hosts),
    local_repo_path:
      input.local_repo_path === undefined && existing
        ? existing.local_repo_path
        : optionalString(input.local_repo_path),
    run_mode:
      input.run_mode === undefined && existing
        ? existing.run_mode
        : normalizeRunMode(input.run_mode),
    default_viewport_width:
      input.default_viewport_width === undefined && existing
        ? existing.default_viewport_width
        : integerValue(input.default_viewport_width, 'default_viewport_width', 1440),
    default_viewport_height:
      input.default_viewport_height === undefined && existing
        ? existing.default_viewport_height
        : integerValue(input.default_viewport_height, 'default_viewport_height', 900),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  const decision = evaluateTargetUrl(app.target_url, {
    allowedHosts: [...app.allowed_hosts, targetHost],
  });
  if (!decision.allowed) throw new ValidationError(decision.reason);
  return app;
}

function optionalId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ValidationError('id must be a string');
  const id = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    throw new ValidationError('id must contain only letters, numbers, underscores or hyphens');
  }
  return id;
}

function rowToApp(row: ObservedAppRow): ObservedApp {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    target_url: row.target_url,
    allowed_hosts: normalizeAllowedHosts(JSON.parse(row.allowed_hosts_json)),
    local_repo_path: row.local_repo_path,
    run_mode: row.run_mode === 'container' ? 'container' : 'host',
    default_viewport_width: row.default_viewport_width,
    default_viewport_height: row.default_viewport_height,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class AppRegistry {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS observed_apps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        target_url TEXT NOT NULL,
        allowed_hosts_json TEXT NOT NULL,
        local_repo_path TEXT,
        run_mode TEXT NOT NULL DEFAULT 'host',
        default_viewport_width INTEGER NOT NULL DEFAULT 1440,
        default_viewport_height INTEGER NOT NULL DEFAULT 900,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  close() {
    this.db.close();
  }

  list(): ObservedApp[] {
    const rows = this.db
      .prepare('SELECT * FROM observed_apps ORDER BY updated_at DESC, name ASC')
      .all() as unknown as ObservedAppRow[];
    return rows.map(rowToApp);
  }

  get(id: string): ObservedApp | null {
    const row = this.db.prepare('SELECT * FROM observed_apps WHERE id = ?').get(id) as unknown as
      ObservedAppRow | undefined;
    return row ? rowToApp(row) : null;
  }

  create(input: ObservedAppInput): ObservedApp {
    const app = validateObservedAppInput(input);
    this.insertOrReplace(app);
    return app;
  }

  ensureSeedApp(input: ObservedAppInput): ObservedApp {
    const id = optionalId(input.id);
    if (id) {
      const existing = this.get(id);
      if (existing) return existing;
    }
    return this.create(input);
  }

  update(id: string, input: ObservedAppInput): ObservedApp | null {
    const existing = this.get(id);
    if (!existing) return null;
    const app = validateObservedAppInput(input, existing);
    this.insertOrReplace(app);
    return app;
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM observed_apps WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private insertOrReplace(app: ObservedApp) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO observed_apps (
          id, name, description, target_url, allowed_hosts_json, local_repo_path,
          run_mode, default_viewport_width, default_viewport_height, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        app.id,
        app.name,
        app.description,
        app.target_url,
        JSON.stringify(app.allowed_hosts),
        app.local_repo_path,
        app.run_mode,
        app.default_viewport_width,
        app.default_viewport_height,
        app.created_at,
        app.updated_at,
      );
  }
}
