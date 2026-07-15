import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MAX_DYNAMIC_SESSIONS_KEY = 'max_dynamic_sessions';

export interface RavenEyeSettings {
  max_dynamic_sessions: number;
}

export class SettingsStore {
  private readonly db: DatabaseSync;

  constructor(databasePath: string, defaults: RavenEyeSettings) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS raveneye_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    if (this.getRaw(MAX_DYNAMIC_SESSIONS_KEY) === null) {
      this.setMaxDynamicSessions(defaults.max_dynamic_sessions);
    }
  }

  close() {
    this.db.close();
  }

  get(): RavenEyeSettings {
    return {
      max_dynamic_sessions: this.getMaxDynamicSessions(),
    };
  }

  getMaxDynamicSessions(): number {
    const value = this.getRaw(MAX_DYNAMIC_SESSIONS_KEY);
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
  }

  setMaxDynamicSessions(value: number): RavenEyeSettings {
    if (!Number.isInteger(value) || value < 1 || value > 50) {
      throw new Error('max_dynamic_sessions must be an integer between 1 and 50');
    }
    this.db
      .prepare(
        `INSERT OR REPLACE INTO raveneye_settings (key, value_json, updated_at)
         VALUES (?, ?, ?)`,
      )
      .run(MAX_DYNAMIC_SESSIONS_KEY, JSON.stringify(value), new Date().toISOString());
    return this.get();
  }

  private getRaw(key: string): unknown {
    const row = this.db
      .prepare('SELECT value_json FROM raveneye_settings WHERE key = ?')
      .get(key) as { value_json: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.value_json) as unknown;
  }
}
