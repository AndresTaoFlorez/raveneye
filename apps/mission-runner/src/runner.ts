import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { parse as parseYaml } from 'yaml';
import {
  OBSERVER_VERSION,
  evaluateTargetUrl,
  parseAllowedHosts,
  type UrlPolicy,
} from '@raveneye/shared';
import { missionSchema, normalizeChecks, type Mission } from './schema.js';
import { executeStep, type StepContext } from './actions.js';
import { RunEvidence } from './evidence.js';
import { generateFindings } from './findings.js';
import { renderReport } from './report.js';
import { inspectInteractiveControls, inspectKeyboardNavigation } from './inspections.js';
import type { ActionRecord, Finding, Inspection, RunManifest } from './types.js';

const require_ = createRequire(import.meta.url);
const playwrightVersion: string = require_('playwright/package.json').version;

/** Exit codes: 0 pass, 1 findings/step failure, 2 mission/config error, 3 browser failure. */
export const EXIT = { PASS: 0, FINDINGS: 1, MISSION_ERROR: 2, BROWSER_ERROR: 3 } as const;

export interface RunnerOptions {
  missionFile: string;
  targetUrlOverride?: string;
  artifactsRoot: string;
  headless: boolean;
  recordVideo: boolean;
  recordTrace: boolean;
}

export function loadMission(yamlText: string): Mission {
  return missionSchema.parse(parseYaml(yamlText));
}

export async function runMission(opts: RunnerOptions): Promise<number> {
  let mission: Mission;
  try {
    mission = loadMission(await readFile(opts.missionFile, 'utf8'));
  } catch (err) {
    console.error(`[mission] invalid mission file: ${(err as Error).message}`);
    return EXIT.MISSION_ERROR;
  }

  const policy: UrlPolicy = {
    allowedHosts: parseAllowedHosts(
      process.env.RAVENEYE_ALLOWED_HOSTS ?? 'sample-app,host.docker.internal,localhost,127.0.0.1',
    ),
  };
  const targetRaw =
    opts.targetUrlOverride ?? mission.target_url ?? process.env.RAVENEYE_TARGET_URL ?? '';
  const decision = evaluateTargetUrl(targetRaw, policy);
  if (!decision.allowed) {
    console.error(`[mission] target rejected: ${decision.reason}`);
    return EXIT.MISSION_ERROR;
  }
  const baseUrl = decision.url;

  const startedAt = new Date();
  const runId = `${startedAt.toISOString().replace(/[:.]/g, '').slice(0, 15)}-${mission.name}`;
  const runDir = join(opts.artifactsRoot, 'runs', runId);
  const screenshotsDir = join(runDir, 'screenshots');
  const videoDir = join(runDir, 'video');
  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(videoDir, { recursive: true });
  console.error(`[mission] run ${runId} → ${runDir}`);

  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  try {
    browser = await chromium.launch({ headless: opts.headless, chromiumSandbox: false });
    context = await browser.newContext({
      viewport: { width: mission.viewport.width, height: mission.viewport.height },
      ...(opts.recordVideo ? { recordVideo: { dir: videoDir, size: mission.viewport } } : {}),
    });
    if (opts.recordTrace) {
      await context.tracing.start({ screenshots: true, snapshots: true });
    }
    page = await context.newPage();
  } catch (err) {
    console.error(`[mission] browser launch failed: ${(err as Error).message}`);
    return EXIT.BROWSER_ERROR;
  }

  const evidence = new RunEvidence();
  evidence.attach(context);

  const inspections: Inspection[] = [];
  const screenshots: string[] = [];
  const actions: ActionRecord[] = [];
  let viewport = { ...mission.viewport };

  const ctx: StepContext = {
    page,
    baseUrl,
    policy,
    screenshotsDir,
    inspections,
    screenshots,
    markers: [],
    setViewport: async (width, height) => {
      await page.setViewportSize({ width, height });
      viewport = { width, height };
    },
  };

  let stepFailed = false;
  for (const [index, step] of mission.steps.entries()) {
    const t0 = Date.now();
    const { action, ...params } = step;
    const record: ActionRecord = {
      index,
      action,
      params,
      started_at: new Date().toISOString(),
      duration_ms: 0,
      status: 'ok',
    };
    try {
      record.detail = await executeStep(ctx, step);
      console.error(`[mission] ${index + 1}/${mission.steps.length} ${action}: ${record.detail}`);
    } catch (err) {
      record.status = 'error';
      record.detail = (err as Error).message.split('\n')[0];
      console.error(
        `[mission] ${index + 1}/${mission.steps.length} ${action} FAILED: ${record.detail}`,
      );
      stepFailed = true;
    }
    record.duration_ms = Date.now() - t0;
    actions.push(record);
    if (stepFailed) break;
  }

  // Automatic end-of-run inspections for checks whose evidence was not
  // explicitly gathered by a step.
  const checks = normalizeChecks(mission.checks);
  const checkNames = new Set(checks.map((c) => c.name));
  try {
    if (checkNames.has('interactive_controls_visible')) {
      inspections.push(await inspectInteractiveControls(page));
    }
    if (checkNames.has('keyboard_navigation_available')) {
      inspections.push(await inspectKeyboardNavigation(page));
    }
    if (
      checkNames.has('no_horizontal_overflow') &&
      !inspections.some((i) => i.kind === 'horizontal-overflow')
    ) {
      const { inspectHorizontalOverflow } = await import('./inspections.js');
      inspections.push(await inspectHorizontalOverflow(page));
    }
  } catch (err) {
    console.error(`[mission] end-of-run inspections failed: ${(err as Error).message}`);
  }

  const currentUrl = page.url();

  const artifactPaths: Record<string, string> = {
    manifest: 'manifest.json',
    report: 'report.md',
    findings: 'findings.json',
    actions: 'actions.json',
    console: 'console.json',
    page_errors: 'page-errors.json',
    network: 'network.json',
    accessibility: 'accessibility.json',
    inspections: 'inspections.json',
    screenshots: 'screenshots/',
  };

  const browserVersion = `chromium ${browser.version()}`;
  if (opts.recordTrace) {
    await context.tracing.stop({ path: join(runDir, 'trace.zip') }).catch((err) => {
      console.error(`[mission] trace save failed: ${err.message}`);
    });
    artifactPaths.trace = 'trace.zip';
  }
  await context.close();
  await browser.close();
  if (opts.recordVideo) {
    const videos = await readdir(videoDir).catch(() => []);
    if (videos.length > 0) artifactPaths.video = `video/${videos[0]}`;
  }

  const findings: Finding[] = generateFindings({
    checks,
    console: evidence.console,
    pageErrors: evidence.pageErrors,
    network: evidence.network,
    inspections,
    actions,
    viewport,
    currentUrl,
  });

  const hasBlocking =
    stepFailed || findings.some((f) => f.severity === 'critical' || f.severity === 'high');
  const status: RunManifest['status'] = stepFailed ? 'error' : hasBlocking ? 'failed' : 'passed';

  const manifest: RunManifest = {
    run_id: runId,
    mission_name: mission.name,
    target_url: baseUrl.toString(),
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    git_commit: process.env.RAVENEYE_GIT_COMMIT ?? 'unknown',
    observer_version: OBSERVER_VERSION,
    browser_version: browserVersion,
    playwright_version: playwrightVersion,
    viewport,
    profile_mode: 'ephemeral',
    status,
    artifact_paths: artifactPaths,
  };

  const a11y = inspections.filter((i) => i.kind === 'accessibility');
  await Promise.all([
    writeFile(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2)),
    writeFile(join(runDir, 'findings.json'), JSON.stringify(findings, null, 2)),
    writeFile(join(runDir, 'actions.json'), JSON.stringify(actions, null, 2)),
    writeFile(join(runDir, 'console.json'), JSON.stringify(evidence.console, null, 2)),
    writeFile(join(runDir, 'page-errors.json'), JSON.stringify(evidence.pageErrors, null, 2)),
    writeFile(join(runDir, 'network.json'), JSON.stringify(evidence.network, null, 2)),
    writeFile(join(runDir, 'accessibility.json'), JSON.stringify(a11y, null, 2)),
    writeFile(join(runDir, 'inspections.json'), JSON.stringify(inspections, null, 2)),
    writeFile(
      join(runDir, 'report.md'),
      renderReport({
        manifest,
        mission,
        actions,
        findings,
        console: evidence.console,
        pageErrors: evidence.pageErrors,
        network: evidence.network,
        screenshots,
      }),
    ),
  ]);

  console.error(
    `[mission] ${status.toUpperCase()} — ${findings.length} finding(s); report: ${join(runDir, 'report.md')}`,
  );
  if (status === 'error') return EXIT.FINDINGS;
  return hasBlocking ? EXIT.FINDINGS : EXIT.PASS;
}
