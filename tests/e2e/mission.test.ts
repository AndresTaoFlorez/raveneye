import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, stat } from 'node:fs/promises';
import { ensureSampleApp, requireStack } from '../integration/stack.js';

const exec = promisify(execFile);

beforeAll(async () => {
  await ensureSampleApp();
  await requireStack();
});

async function runMission(name: string): Promise<void> {
  const commit = await exec('git', ['rev-parse', '--short', 'HEAD']).then(
    ({ stdout }) => stdout.trim(),
    () => 'unknown',
  );
  await exec(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      '-e',
      `RAVENEYE_GIT_COMMIT=${commit}`,
      '-e',
      'RAVENEYE_RECORD_VIDEO=true',
      '-e',
      'RAVENEYE_RECORD_TRACE=true',
      '-e',
      'RAVENEYE_ALLOWED_HOSTS=sample-app,host.docker.internal,localhost,127.0.0.1',
      'raveneye',
      'node',
      '/app/apps/mission-runner/dist/cli.js',
      'run',
      `/config/missions/${name}.yaml`,
      '--target-url=http://sample-app:3000',
      '--headless',
    ],
    { timeout: 120_000 },
  );
}

async function latestRun(name: string): Promise<string> {
  const runs = (await readdir('artifacts/runs')).filter((r) => r.endsWith(name)).sort();
  expect(runs.length, `runs for ${name}`).toBeGreaterThan(0);
  return `artifacts/runs/${runs[runs.length - 1]}`;
}

describe('e2e mission runs (real containerized Chromium)', () => {
  it('generic-smoke passes and produces the full artifact tree', async () => {
    await runMission('generic-smoke');
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
    const result = await runMission('error-hunt').catch((err) => err as { code?: number });
    expect(result.code).toBe(1);
    const dir = await latestRun('error-hunt');
    const findings = JSON.parse(await readFile(`${dir}/findings.json`, 'utf8'));
    expect(findings.some((f: { severity: string }) => f.severity === 'high')).toBe(true);
  }, 150_000);
});
