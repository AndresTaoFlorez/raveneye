---
tags: [missions, reference]
---

# Artifacts

Every [Mission Runner](./Mission%20Runner.md) execution writes a complete evidence tree under `artifacts/runs/<run-id>/`. The run-id is `<timestamp>-<mission-name>`.

```
artifacts/runs/<run-id>/
├── manifest.json      run metadata (below)
├── report.md          human-readable summary — read this first
├── findings.json      structured problems, see Findings
├── actions.json       per-step records with status and timing
├── console.json       console output (redacted)
├── page-errors.json   uncaught exceptions
├── network.json       every request: status, timing, redacted headers
├── accessibility.json aria snapshots + heuristic issues
├── inspections.json   overflow / control-visibility / keyboard data
├── trace.zip          Playwright trace
├── video/*.webm       full-run recording
└── screenshots/*.png  named captures from screenshot steps
```

## manifest.json

Contains `run_id`, `mission_name`, `target_url`, `started_at` / `completed_at`, `git_commit` (of the repo at run time), `observer_version`, `browser_version`, `playwright_version`, `viewport`, `profile_mode`, `status` (passed/failed/error) and `artifact_paths`.

## Working with artifacts

```bash
make artifacts                 # list recent runs
make trace RUN_ID=<run-id>     # open the trace viewer (DOM at every step)
make cleanup                   # delete runs older than the retention window
```

Interactive screenshots taken through the [Control API](../02-Architecture/Control%20API.md) land in `artifacts/screenshots/` (outside `runs/`).

## Handling

- Everything passed [Secret Redaction](../06-Security/Secret%20Redaction.md) at capture time; bodies are never stored.
- `artifacts/` is git-ignored, owned by the host user (uid 1000, see [Docker Design](../02-Architecture/Docker%20Design.md)), and treated as sensitive — screenshots can show authorized applications.
- Retention: `RAVENEYE_ARTIFACT_RETENTION_DAYS` (default 14), see [Configuration](../05-Operations/Configuration.md).

Comparing `findings.json` between two runs of the same mission is the verification step of the [Reasoning Loop](../04-Agents/Reasoning%20Loop.md).
