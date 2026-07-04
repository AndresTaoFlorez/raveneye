import type { ConsoleEntry, NetworkEntry } from '@ui-observer/shared';
import { isNetworkProblem } from '@ui-observer/shared';
import type { Mission } from './schema.js';
import type { ActionRecord, Finding, RunManifest } from './types.js';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'informational'] as const;

export function renderReport(args: {
  manifest: RunManifest;
  mission: Mission;
  actions: ActionRecord[];
  findings: Finding[];
  console: ConsoleEntry[];
  pageErrors: ConsoleEntry[];
  network: NetworkEntry[];
  screenshots: string[];
}): string {
  const { manifest, mission, actions, findings } = args;
  const bySeverity = (s: string) => findings.filter((f) => f.severity === s);
  const problems = args.network.filter(isNetworkProblem);
  const lines: string[] = [];

  lines.push(`# Mission report: ${mission.name}`);
  lines.push('');
  lines.push(`> ${mission.description || 'no description'}`);
  lines.push('');
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| Run | \`${manifest.run_id}\` |`);
  lines.push(`| Status | **${manifest.status}** |`);
  lines.push(`| Target | ${manifest.target_url} |`);
  lines.push(`| Viewport | ${manifest.viewport.width}×${manifest.viewport.height} |`);
  lines.push(`| Started | ${manifest.started_at} |`);
  lines.push(`| Completed | ${manifest.completed_at} |`);
  lines.push(`| Browser | ${manifest.browser_version} (Playwright ${manifest.playwright_version}) |`);
  lines.push(`| Git commit | ${manifest.git_commit} |`);
  lines.push('');

  lines.push(`## Findings (${findings.length})`);
  lines.push('');
  if (findings.length === 0) {
    lines.push('No findings. All configured checks passed.');
  } else {
    for (const sev of SEVERITY_ORDER) {
      const group = bySeverity(sev);
      if (group.length === 0) continue;
      lines.push(`### ${sev} (${group.length})`);
      lines.push('');
      for (const f of group) {
        lines.push(`- **${f.finding_id} — ${f.title}** _[${f.category}]_`);
        lines.push(`  - ${f.description}`);
        lines.push(`  - route: ${f.route}`);
        lines.push(`  - expected: ${f.expected_behavior}`);
        lines.push(`  - actual: ${f.actual_behavior}`);
        lines.push(`  - suspected: ${f.suspected_component} (confidence: ${f.confidence})`);
        lines.push(`  - evidence: ${f.evidence.join(', ')}`);
      }
      lines.push('');
    }
  }

  lines.push(`## Steps executed (${actions.length})`);
  lines.push('');
  lines.push('| # | action | result | ms |');
  lines.push('|---|---|---|---|');
  for (const a of actions) {
    const mark = a.status === 'ok' ? '✓' : '✗ FAILED';
    lines.push(
      `| ${a.index + 1} | \`${a.action}\` | ${mark} ${a.detail ?? ''} | ${a.duration_ms} |`,
    );
  }
  lines.push('');

  lines.push('## Evidence summary');
  lines.push('');
  lines.push(`- console entries: ${args.console.length} (errors: ${args.console.filter((c) => c.level === 'error').length})`);
  lines.push(`- unhandled page errors: ${args.pageErrors.length}`);
  lines.push(`- network entries: ${args.network.length} (problems: ${problems.length})`);
  lines.push(`- screenshots: ${args.screenshots.map((s) => s.split('/').pop()).join(', ') || 'none'}`);
  lines.push(`- trace: ${manifest.artifact_paths.trace ?? 'not recorded'}`);
  lines.push(`- video: ${manifest.artifact_paths.video ?? 'not recorded'}`);
  lines.push('');
  lines.push(`Artifacts directory: \`artifacts/runs/${manifest.run_id}/\``);
  lines.push('');
  return lines.join('\n');
}
