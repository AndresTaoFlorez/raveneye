import { isNetworkProblem, type ConsoleEntry, type NetworkEntry } from '@ui-observer/shared';
import type { NormalizedCheck } from './schema.js';
import type { ActionRecord, Finding, Inspection } from './types.js';

export interface FindingInputs {
  checks: NormalizedCheck[];
  console: ConsoleEntry[];
  pageErrors: ConsoleEntry[];
  network: NetworkEntry[];
  inspections: Inspection[];
  actions: ActionRecord[];
  viewport: { width: number; height: number };
  currentUrl: string;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `F-${String(counter).padStart(3, '0')}`;
}

function reproSteps(actions: ActionRecord[]): string[] {
  return actions
    .filter((a) => a.status === 'ok')
    .map((a) => `${a.index + 1}. ${a.action} ${JSON.stringify(a.params)}`);
}

const allowed = (allow: string[], text: string) => allow.some((p) => text.includes(p));

/** Evaluate mission checks against collected evidence and emit findings. */
export function generateFindings(inputs: FindingInputs): Finding[] {
  counter = 0;
  const findings: Finding[] = [];
  const base = {
    viewport: inputs.viewport,
    reproduction_steps: reproSteps(inputs.actions),
    status: 'open' as const,
  };

  for (const failed of inputs.actions.filter((a) => a.status === 'error')) {
    findings.push({
      ...base,
      finding_id: nextId(),
      category: 'functional',
      severity: 'high',
      title: `Mission step ${failed.index + 1} (${failed.action}) failed`,
      description: failed.detail ?? 'step execution failed',
      route: inputs.currentUrl,
      expected_behavior: `step "${failed.action}" completes`,
      actual_behavior: failed.detail ?? 'failure',
      evidence: ['actions.json'],
      suspected_component: 'target application (or mission definition)',
      confidence: 'medium',
    });
  }

  for (const check of inputs.checks) {
    switch (check.name) {
      case 'no_unhandled_page_errors': {
        for (const err of inputs.pageErrors.filter((e) => !allowed(check.allow, e.text))) {
          findings.push({
            ...base,
            finding_id: nextId(),
            category: 'console',
            severity: 'high',
            title: 'Unhandled page error',
            description: err.text,
            route: err.page_url,
            expected_behavior: 'no uncaught exceptions during the journey',
            actual_behavior: `uncaught: ${err.text}`,
            evidence: ['page-errors.json'],
            suspected_component: 'frontend JavaScript',
            confidence: 'high',
          });
        }
        break;
      }
      case 'no_critical_console_errors': {
        for (const err of inputs.console.filter(
          (e) => e.level === 'error' && !allowed(check.allow, `${e.text} ${e.location ?? ''}`),
        )) {
          findings.push({
            ...base,
            finding_id: nextId(),
            category: 'console',
            severity: 'medium',
            title: 'Console error',
            description: err.text,
            route: err.page_url,
            expected_behavior: 'console free of errors',
            actual_behavior: err.text,
            evidence: ['console.json'],
            suspected_component: err.location ?? 'frontend',
            confidence: 'high',
          });
        }
        break;
      }
      case 'no_unexpected_failed_requests': {
        for (const bad of inputs.network.filter(
          (n) => isNetworkProblem(n) && !allowed(check.allow, n.url),
        )) {
          findings.push({
            ...base,
            finding_id: nextId(),
            category: 'network',
            severity: bad.failure || (bad.status ?? 0) >= 500 ? 'high' : 'medium',
            title: `Request problem: ${bad.method} ${bad.url}`,
            description: bad.failure ?? `HTTP ${bad.status}`,
            route: inputs.currentUrl,
            expected_behavior: 'all requests succeed (or are explicitly allowed)',
            actual_behavior: bad.failure ?? `status ${bad.status}`,
            evidence: ['network.json'],
            suspected_component: 'backend endpoint or client request logic',
            confidence: 'high',
          });
        }
        break;
      }
      case 'no_horizontal_overflow': {
        for (const insp of inputs.inspections) {
          if (insp.kind === 'horizontal-overflow' && insp.has_overflow) {
            findings.push({
              ...base,
              finding_id: nextId(),
              category: 'responsive',
              severity: 'medium',
              title: 'Horizontal overflow detected',
              description: `page scrolls horizontally: content ${insp.scroll_width}px wide in a ${insp.client_width}px viewport; offenders: ${insp.offenders.map((o) => o.element).join(', ') || 'n/a'}`,
              route: insp.page_url,
              expected_behavior: 'content fits the viewport width',
              actual_behavior: `scrollWidth ${insp.scroll_width} > clientWidth ${insp.client_width}`,
              evidence: ['inspections.json'],
              suspected_component: insp.offenders[0]?.element ?? 'layout CSS',
              confidence: 'high',
            });
          }
        }
        break;
      }
      case 'interactive_controls_visible': {
        for (const insp of inputs.inspections) {
          if (insp.kind !== 'interactive-controls') continue;
          for (const p of insp.problematic.filter((x) => !allowed(check.allow, x.element))) {
            findings.push({
              ...base,
              finding_id: nextId(),
              category: 'usability',
              severity: 'medium',
              title: `Interactive control problem: ${p.element}`,
              description: p.reason,
              route: insp.page_url,
              expected_behavior: 'interactive controls are visible and reasonably sized',
              actual_behavior: p.reason,
              evidence: ['inspections.json'],
              suspected_component: p.element,
              confidence: 'medium',
            });
          }
        }
        break;
      }
      case 'keyboard_navigation_available': {
        for (const insp of inputs.inspections) {
          if (insp.kind === 'keyboard-navigation' && insp.distinct_stops < 2) {
            findings.push({
              ...base,
              finding_id: nextId(),
              category: 'accessibility',
              severity: 'high',
              title: 'Keyboard navigation not available',
              description: `tabbing reached only ${insp.distinct_stops} distinct element(s)`,
              route: insp.page_url,
              expected_behavior: 'interactive elements reachable via Tab',
              actual_behavior: `focus sequence: ${insp.sequence.join(' → ') || 'none'}`,
              evidence: ['inspections.json'],
              suspected_component: 'focus management / tabindex usage',
              confidence: 'medium',
            });
          }
        }
        break;
      }
    }
  }

  // Accessibility issues surface as informational findings even without a
  // dedicated check: they were explicitly requested via inspect_accessibility.
  for (const insp of inputs.inspections) {
    if (insp.kind !== 'accessibility') continue;
    for (const issue of insp.issues) {
      findings.push({
        ...base,
        finding_id: nextId(),
        category: 'accessibility',
        severity: 'low',
        title: `${issue.type}: ${issue.element}`,
        description: issue.detail,
        route: insp.page_url,
        expected_behavior: 'element exposes an accessible name/label',
        actual_behavior: issue.detail,
        evidence: ['accessibility.json'],
        suspected_component: issue.element,
        confidence: 'high',
      });
    }
  }

  return findings;
}
