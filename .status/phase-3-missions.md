# Phase 3 — Mission runner: COMPLETE

Date: 2026-07-03

## Delivered

- `apps/mission-runner`: zod-validated YAML mission schema (all 22 required actions as a
  strict discriminated union; checks accept `allow` substring patterns for expected noise),
  action executor, per-run evidence collection (console/page-errors/network, all redacted),
  inspections (horizontal overflow with offender geometry, accessibility snapshot + heuristics,
  interactive-control visibility, keyboard reachability), findings generator, markdown report,
  manifest, and CLI (`run`, `validate`) with exit codes 0/1/2/3.
- Sample missions: `generic-smoke`, `error-hunt`, `responsive-sweep` (config/missions/).
- `scripts/run-mission.sh` + `make mission MISSION=<name>` / `make smoke`; `./config` mounted
  read-only into the container.
- Missions run in their own clean headed context on the same X display — the human watches
  the run live in noVNC while trace/video record natively.

## Verification record (2026-07-03)

| Mission | Result | Notes |
|---|---|---|
| generic-smoke | PASSED, 0 findings, exit 0 | 16 steps incl. modal, history back/forward, overflow check |
| error-hunt | FAILED, 9 findings, exit 1 | uncaught exception (high), HTTP 500 (high), ERR_ABORTED (high), 4 console errors, 403 — all intentional sample-app defects detected |
| responsive-sweep | PASSED with 3 medium findings | overflow detected at 1440/820/390px on `?broken=1` incl. offender `div.card` 1200px |

Artifact tree per run (verified on disk): `manifest.json`, `report.md`, `findings.json`,
`actions.json`, `console.json`, `page-errors.json`, `network.json`, `accessibility.json`,
`inspections.json`, `trace.zip` (~1.4 MB), `video/*.webm`, `screenshots/*.png`.

Redaction verified at mission level: `/api/secure-data` recorded with
`authorization: [REDACTED]`; asserted no secret substring anywhere in `network.json`.

Unit tests: 23 passing (url-policy, redaction, mission schema).

## Notes

- `inspections.json` added beyond the spec's file list (overflow/controls/keyboard evidence);
  `accessibility.json` holds the aria snapshots + a11y issues.
- Findings severity → exit code: critical/high (or step failure) ⇒ exit 1.
- Missions always use ephemeral contexts; the persistent profile belongs to the interactive
  shared browser (documented limitation, by design).
