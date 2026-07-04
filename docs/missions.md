# Missions

A mission is a declarative YAML journey: navigate, interact, capture, check.
Missions live in `config/missions/` (mounted read-only at `/config` in the container).

```bash
make mission MISSION=generic-smoke      # or: scripts/run-mission.sh generic-smoke
make smoke                              # alias for generic-smoke
scripts/ci-run.sh generic-smoke         # headless CI variant, no ports
```

Exit codes: `0` pass · `1` critical/high findings or a failed step · `2` invalid
mission/config · `3` browser failure.

## Format

```yaml
name: generic-smoke            # kebab-case, required
description: Basic validation
target_url: http://sample-app:3000   # optional; falls back to UI_OBSERVER_TARGET_URL

viewport: { width: 1440, height: 900 }   # optional, this is the default

steps:                         # executed in order; first failure stops the run
  - action: goto
    path: /                    # relative to target_url (or use url: absolute)
  - action: click
    role: button               # locators: selector | role(+name) | text | label
    name: Open dialog
  - action: screenshot
    name: modal-open

checks:                        # evaluated after the steps against collected evidence
  - no_unhandled_page_errors
  - name: no_critical_console_errors
    allow: ["favicon.ico"]     # substring patterns for expected noise
```

Validation is strict (zod): unknown actions, unknown checks, or extra fields fail
immediately with a precise error. Validate without running:
`node apps/mission-runner/dist/cli.js validate config/missions/<name>.yaml`.

## Actions

| Action | Parameters | Notes |
|---|---|---|
| `goto` / `navigate` | `path` or `url` | URL-policy checked |
| `reload` `back` `forward` | — | history navigation |
| `click` `hover` `check` `uncheck` | locator | |
| `fill` | locator, `value` | replaces content |
| `type` | locator, `value`, `delay_ms?` | keystroke by keystroke |
| `press` | `key`, `selector?` | e.g. `Escape`, `Tab` |
| `select` | locator, `value` | `<select>` options |
| `scroll` | `to: top\|bottom` or `y: <px>` | |
| `wait` | `ms` (≤ 60000) | |
| `wait_for_ready` | `timeout_ms?` | load + best-effort networkidle |
| `wait_for_selector` | `selector`, `state?`, `timeout_ms?` | |
| `screenshot` | `name`, `full_page?` | saved under `screenshots/` |
| `inspect_accessibility` | `name?` | aria snapshot + heuristic issues |
| `capture_console` / `capture_network` | — | markers; evidence is collected continuously |
| `check_horizontal_overflow` | — | scroll vs client width + offender elements |
| `set_viewport` | `width`, `height` | for responsive sweeps |

Locators: `selector` (CSS), `role` + `name` (preferred, matches accessibility tree),
`label` (form fields), `text`. Exactly one strategy per step.

Not supported (by design — this is not a programming language): conditionals, loops,
variables, file uploads, multi-tab orchestration, drag-and-drop. Script complex journeys
directly with Playwright over CDP instead (docs/agent-integration.md).

## Checks → findings

| Check | Finding severity |
|---|---|
| `no_unhandled_page_errors` | high per uncaught exception |
| `no_critical_console_errors` | medium per console error |
| `no_unexpected_failed_requests` | high for 5xx/aborted, medium for 4xx |
| `no_horizontal_overflow` | medium, with offender geometry |
| `interactive_controls_visible` | medium (zero-size, off-viewport, tiny hit targets) |
| `keyboard_navigation_available` | high if Tab reaches < 2 elements |

Every check accepts `allow: [substrings]` matched against the message/URL/element to
whitelist expected noise. A failed *step* always produces a high `functional` finding.
`inspect_accessibility` issues (missing labels, missing accessible names, missing alt)
are emitted as `low` accessibility findings.

## Artifacts

```
artifacts/runs/<run-id>/
├── manifest.json      run metadata: versions, commit, viewport, status, paths
├── report.md          human-readable summary
├── findings.json      structured findings (id, category, severity, repro, evidence…)
├── actions.json       per-step execution records with timing
├── console.json       console output (redacted)
├── page-errors.json   uncaught exceptions
├── network.json       requests with status/timing/redacted headers
├── accessibility.json aria snapshots + issues
├── inspections.json   overflow/controls/keyboard inspection data
├── trace.zip          Playwright trace — open with: make trace RUN_ID=<run-id>
├── video/*.webm       full-run recording
└── screenshots/*.png  named captures from screenshot steps
```
