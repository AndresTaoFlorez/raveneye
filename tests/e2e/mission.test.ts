import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, stat } from 'node:fs/promises';
import { requireStack } from '../integration/stack.js';

const exec = promisify(execFile);

beforeAll(requireStack);

async function latestRun(name: string): Promise<string> {
  const runs = (await readdir('artifacts/runs')).filter((r) => r.endsWith(name)).sort();
  expect(runs.length, `runs for ${name}`).toBeGreaterThan(0);
  return `artifacts/runs/${runs[runs.length - 1]}`;
}

describe('e2e mission runs (real containerized Chromium)', () => {
  it('generic-smoke passes and produces the full artifact tree', async () => {
    await exec('./scripts/run-mission.sh', ['generic-smoke'], { timeout: 120_000 });
    const dir = await latestRun('generic-smoke');
    for (const f of [
      'manifest.json',
      'report.md',
      'findings.json',
      'actions.json',
      'console.json',
      'page-errors.json',
      'network.json',
      'accessibility.json',
      'trace.zip',
    ]) {
      await expect(stat(`${dir}/${f}`), f).resolves.toBeDefined();
    }
    const manifest = JSON.parse(await readFile(`${dir}/manifest.json`, 'utf8'));
    expect(manifest.status).toBe('passed');
    const videos = await readdir(`${dir}/video`);
    expect(videos.length).toBeGreaterThan(0);
    const shots = await readdir(`${dir}/screenshots`);
    expect(shots).toContain('home.png');
  }, 150_000);

  it('error-hunt fails with exit code 1 and high findings', async () => {
    const result = await exec('./scripts/run-mission.sh', ['error-hunt'], {
      timeout: 120_000,
    }).catch((err) => err as { code?: number });
    expect(result.code).toBe(1);
    const dir = await latestRun('error-hunt');
    const findings = JSON.parse(await readFile(`${dir}/findings.json`, 'utf8'));
    expect(findings.some((f: { severity: string }) => f.severity === 'high')).toBe(true);
  }, 150_000);
});
