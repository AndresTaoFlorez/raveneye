---
tags: [overview]
---

# Project History

Built from scratch on 2026-07-03 in five demonstrated phases. Nothing was declared done until proven against the real Docker environment — status reports with command-level evidence live in `.status/` at the repository root.

| Phase | Commit | Milestone |
|---|---|---|
| 0 — Scaffold | `4001e99` | npm workspaces monorepo, pinned toolchain, Makefile, [Configuration](../05-Operations/Configuration.md) template |
| 1 — Visible browser | `f434e9b` | [Display Stack](../02-Architecture/Display%20Stack.md) + [Sample App](../02-Architecture/Sample%20App.md) + [Observer Server](../02-Architecture/Observer%20Server.md); Chromium proven visible via X-framebuffer capture |
| 2 — Programmatic control | `3836d90` | [CDP Endpoint](../02-Architecture/CDP%20Endpoint.md), expanded [Control API](../02-Architecture/Control%20API.md), [Observer CLI](../04-Agents/Observer%20CLI.md), [Secret Redaction](../06-Security/Secret%20Redaction.md); shared control demonstrated |
| 3 — Mission runner | `7cb766a` | [Mission Format](../03-Missions/Mission%20Format.md), [Actions Reference](../03-Missions/Actions%20Reference.md), [Findings](../03-Missions/Findings.md), [Artifacts](../03-Missions/Artifacts.md); three [Sample Missions](../03-Missions/Sample%20Missions.md) verified |
| 4 — Agent integration | `4726106` | [Agent Integration](../04-Agents/Agent%20Integration.md) guide + the [Reasoning Loop](../04-Agents/Reasoning%20Loop.md) demonstrated with a real planted bug |
| 5 — Hardening | `5cc8185` | [Testing](../05-Operations/Testing.md) (37 tests), [CI Mode](../05-Operations/CI%20Mode.md), [Profiles](../05-Operations/Profiles.md) lifecycle, [Health Model](../02-Architecture/Health%20Model.md) demos, [Security Model](../06-Security/Security%20Model.md) docs |

## Key evidence artifacts

- `artifacts/phase1-novnc-display-proof.png` — the actual X framebuffer: headed Chromium rendering the [Sample App](../02-Architecture/Sample%20App.md), exactly what noVNC streams.
- `artifacts/phase2-shared-control-modal.png` — a host-side agent clicked "Open dialog" over CDP; the modal is visible on the human's display.
- `artifacts/runs/2026-07-04T0223-generic-smoke` vs `…T0224…` — the failed/clean pair from the [Reasoning Loop](../04-Agents/Reasoning%20Loop.md) demonstration.

## Lessons captured during the build

- Headed Chromium binds CDP to loopback only → the socat relay in [CDP Endpoint](../02-Architecture/CDP%20Endpoint.md).
- Chromium flushes cookies lazily (~30 s) → `stop_grace_period: 30s`; see [Profiles](../05-Operations/Profiles.md).
- Playwright's bundled ffmpeg lacks `x11grab` → `scrot` added for display-level captures.
- All 23 mandatory demonstrations, each with evidence, are tabulated in `.status/current.md`.

Related: [What is RavenEye](./What%20is%20RavenEye.md) · [Architecture Overview](../02-Architecture/Architecture%20Overview.md)
