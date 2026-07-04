#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { runMission, loadMission, EXIT } from './runner.js';

function usage(): never {
  console.error(`usage:
  ui-observer-mission run <mission.yaml> [--target-url=URL] [--headless] [--no-video] [--no-trace]
  ui-observer-mission validate <mission.yaml>`);
  process.exit(EXIT.MISSION_ERROR);
}

const [cmd, file, ...rest] = process.argv.slice(2);
if (!cmd || !file) usage();

const flags = new Map<string, string | boolean>();
for (const arg of rest) {
  const m = arg.match(/^--([a-z-]+)(?:=(.*))?$/);
  if (!m) usage();
  flags.set(m[1]!, m[2] ?? true);
}

if (cmd === 'validate') {
  try {
    const mission = loadMission(await readFile(file, 'utf8'));
    console.log(`valid: ${mission.name} (${mission.steps.length} steps, ${mission.checks.length} checks)`);
    process.exit(EXIT.PASS);
  } catch (err) {
    console.error(`invalid mission: ${(err as Error).message}`);
    process.exit(EXIT.MISSION_ERROR);
  }
}

if (cmd !== 'run') usage();

const envTrue = (v: string | undefined, fallback: boolean) =>
  v === undefined ? fallback : v === 'true' || v === '1';

const code = await runMission({
  missionFile: file,
  targetUrlOverride: typeof flags.get('target-url') === 'string' ? String(flags.get('target-url')) : undefined,
  artifactsRoot: process.env.UI_OBSERVER_ARTIFACTS_DIR ?? '/artifacts',
  headless:
    flags.has('headless') ||
    process.env.UI_OBSERVER_HEADLESS === 'true' ||
    process.env.UI_OBSERVER_HEADLESS === '1',
  recordVideo: !flags.has('no-video') && envTrue(process.env.UI_OBSERVER_RECORD_VIDEO, true),
  recordTrace: !flags.has('no-trace') && envTrue(process.env.UI_OBSERVER_RECORD_TRACE, true),
});
process.exit(code);
