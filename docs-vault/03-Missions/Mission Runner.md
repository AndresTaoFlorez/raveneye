---
tags: [missions]
---

# Mission Runner

The evaluation engine (`apps/mission-runner/`): it executes a [[Mission Format]] file step by step in a **clean, reproducible browser context** and leaves a complete evidence tree ([[Artifacts]]).

## Execution model

1. Parse + validate the YAML (strict zod schema) — invalid missions exit `2` immediately.
2. Resolve the target URL (mission `target_url` → `--target-url` flag → `RAVENEYE_TARGET_URL`) and enforce the [[URL Policy]].
3. Launch a **headed** Chromium context on the same display as the shared session — the human watches the mission live in noVNC ([[Shared Browser Model]] explains why it is a separate context).
4. Start tracing and video recording; attach redacted evidence collectors ([[Secret Redaction]]).
5. Execute steps sequentially ([[Actions Reference]]); **the first failed step stops the run** and becomes a high `functional` finding.
6. Run end-of-run inspections for any [[Checks Reference]] whose evidence was not explicitly gathered.
7. Generate [[Findings]], write [[Artifacts]], print the report path.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | passed — no critical/high findings |
| 1 | critical/high findings or a failed step |
| 2 | invalid mission or rejected target |
| 3 | browser failure |

## Running

```bash
make mission MISSION=generic-smoke     # inside the running container
make smoke                             # shortcut for generic-smoke
scripts/ci-run.sh generic-smoke        # headless one-off, see CI Mode
node apps/mission-runner/dist/cli.js validate config/missions/x.yaml
```

Missions always use **ephemeral contexts**; persistent state belongs to the interactive shared session (see [[Profiles]]).

Related: [[Sample Missions]] · [[Reasoning Loop]] · [[Testing]]
