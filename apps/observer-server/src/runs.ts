import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

interface RunManifestSummary {
  run_id?: string;
  mission_name?: string;
  status?: string;
  target_url?: string;
  started_at?: string;
  completed_at?: string;
}

export interface RunSummary {
  run_id: string;
  path: string;
  updated_at: string;
  manifest: RunManifestSummary | null;
  finding_count: number | null;
  report_path: string | null;
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

export async function readRun(artifactsDir: string, runId: string): Promise<RunSummary | null> {
  if (!/^[a-zA-Z0-9_.-]+$/.test(runId)) return null;
  const runPath = join(artifactsDir, 'runs', runId);
  let runStat;
  try {
    runStat = await stat(runPath);
  } catch {
    return null;
  }
  if (!runStat.isDirectory()) return null;

  const manifest = await readJson<RunManifestSummary>(join(runPath, 'manifest.json'));
  const findings = await readJson<unknown[]>(join(runPath, 'findings.json'));
  const reportPath = join(runPath, 'report.md');
  return {
    run_id: manifest?.run_id ?? runId,
    path: runPath,
    updated_at: runStat.mtime.toISOString(),
    manifest,
    finding_count: Array.isArray(findings) ? findings.length : null,
    report_path: (await fileExists(reportPath)) ? reportPath : null,
  };
}

export async function listRuns(artifactsDir: string, limit = 25): Promise<RunSummary[]> {
  const runsDir = join(artifactsDir, 'runs');
  let entries;
  try {
    entries = await readdir(runsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const runs = await Promise.all(dirs.map((dir) => readRun(artifactsDir, dir)));
  return runs
    .filter((run): run is RunSummary => run !== null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}
