---
tags: [missions]
---

# Mission Format

A mission is declarative YAML: identity, viewport, ordered steps, named checks. Deliberately **not** a programming language — no conditionals, loops or variables. Complex logic belongs in [[Playwright over CDP]] scripts.

```yaml
name: generic-smoke              # kebab-case, required
description: Basic validation
target_url: http://sample-app:3000   # optional; falls back to RAVENEYE_TARGET_URL

viewport: { width: 1440, height: 900 }   # default shown

steps:
  - action: goto
    path: /                      # relative to target_url; url: for absolute
  - action: click
    role: button                 # locator strategies below
    name: Open dialog
  - action: screenshot
    name: modal-open

checks:
  - no_unhandled_page_errors
  - name: no_critical_console_errors
    allow: ["favicon.ico"]       # substring allow-list for expected noise
```

## Validation

The zod schema is **strict**: unknown actions, unknown checks, extra fields, or a `click` without a locator all fail with a precise error before any browser starts (exit code 2 — see [[Mission Runner]]). Validate standalone:

```bash
node apps/mission-runner/dist/cli.js validate config/missions/<name>.yaml
```

## Locator strategies

Exactly one per interaction step:

| Strategy | Example | Notes |
|---|---|---|
| `role` + `name` | `role: button, name: Open dialog` | preferred — matches the accessibility tree |
| `label` | `label: Full name` | form fields |
| `text` | `text: Back to articles` | visible text |
| `selector` | `selector: '#signup'` | CSS, last resort |

## Files

Missions live in `config/missions/` (mounted read-only at `/config`, see [[Docker Design]]). The bundled ones are described in [[Sample Missions]].

Related: [[Actions Reference]] · [[Checks Reference]] · [[Findings]]
