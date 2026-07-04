---
tags: [overview]
---

# Project History

Built from scratch on 2026-07-03 in five demonstrated phases. Nothing was declared done until proven against the real Docker environment — status reports with command-level evidence live in `.status/` at the repository root.

| Phase | Commit | Milestone |
|---|---|---|
| 0 — Scaffold | `4001e99` | npm workspaces monorepo, pinned toolchain, Makefile, [[Configuration]] template |
| 1 — Visible browser | `f434e9b` | [[Display Stack]] + [[Sample App]] + [[Observer Server]]; Chromium proven visible via X-framebuffer capture |
| 2 — Programmatic control | `3836d90` | [[CDP Endpoint]], expanded [[Control API]], [[Observer CLI]], [[Secret Redaction]]; shared control demonstrated |
| 3 — Mission runner | `7cb766a` | [[Mission Format]], [[Actions Reference]], [[Findings]], [[Artifacts]]; three [[Sample Missions]] verified |
| 4 — Agent integration | `4726106` | [[Agent Integration]] guide + the [[Reasoning Loop]] demonstrated with a real planted bug |
| 5 — Hardening | `5cc8185` | [[Testing]] (37 tests), [[CI Mode]], [[Profiles]] lifecycle, [[Health Model]] demos, [[Security Model]] docs |

## Key evidence artifacts

- `artifacts/phase1-novnc-display-proof.png` — the actual X framebuffer: headed Chromium rendering the [[Sample App]], exactly what noVNC streams.
- `artifacts/phase2-shared-control-modal.png` — a host-side agent clicked "Open dialog" over CDP; the modal is visible on the human's display.
- `artifacts/runs/2026-07-04T0223-generic-smoke` vs `…T0224…` — the failed/clean pair from the [[Reasoning Loop]] demonstration.

## Lessons captured during the build

- Headed Chromium binds CDP to loopback only → the socat relay in [[CDP Endpoint]].
- Chromium flushes cookies lazily (~30 s) → `stop_grace_period: 30s`; see [[Profiles]].
- Playwright's bundled ffmpeg lacks `x11grab` → `scrot` added for display-level captures.
- All 23 mandatory demonstrations, each with evidence, are tabulated in `.status/current.md`.

Related: [[What is RavenEye]] · [[Architecture Overview]]
