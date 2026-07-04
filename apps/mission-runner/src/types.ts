export interface ActionRecord {
  index: number;
  action: string;
  params: Record<string, unknown>;
  started_at: string;
  duration_ms: number;
  status: 'ok' | 'error';
  detail?: string;
}

export type FindingCategory =
  | 'functional'
  | 'visual'
  | 'usability'
  | 'routing'
  | 'accessibility'
  | 'responsive'
  | 'console'
  | 'network'
  | 'performance'
  | 'data-state'
  | 'security';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface Finding {
  finding_id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  route: string;
  viewport: { width: number; height: number };
  reproduction_steps: string[];
  expected_behavior: string;
  actual_behavior: string;
  evidence: string[];
  suspected_component: string;
  confidence: 'high' | 'medium' | 'low';
  status: 'open';
}

export interface OverflowInspection {
  kind: 'horizontal-overflow';
  page_url: string;
  ts: string;
  has_overflow: boolean;
  scroll_width: number;
  client_width: number;
  offenders: { element: string; right: number; width: number }[];
}

export interface A11yInspection {
  kind: 'accessibility';
  name: string;
  page_url: string;
  ts: string;
  aria_snapshot: string;
  issues: { type: string; element: string; detail: string }[];
}

export interface ControlsInspection {
  kind: 'interactive-controls';
  page_url: string;
  ts: string;
  total: number;
  problematic: { element: string; reason: string }[];
}

export interface KeyboardInspection {
  kind: 'keyboard-navigation';
  page_url: string;
  ts: string;
  distinct_stops: number;
  sequence: string[];
}

export type Inspection =
  | OverflowInspection
  | A11yInspection
  | ControlsInspection
  | KeyboardInspection;

export interface RunManifest {
  run_id: string;
  mission_name: string;
  target_url: string;
  started_at: string;
  completed_at: string;
  git_commit: string;
  observer_version: string;
  browser_version: string;
  playwright_version: string;
  viewport: { width: number; height: number };
  profile_mode: string;
  status: 'passed' | 'failed' | 'error';
  artifact_paths: Record<string, string>;
}
