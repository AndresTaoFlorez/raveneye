# Phase 5 — Hardening: COMPLETE

Date: 2026-07-03

## Delivered

- **Tests (37 passing)**: unit (url-policy 8, redaction 6, mission schema 8, findings 6)
  + integration against the real stack (health components, noVNC loopback, CDP shared-browser
  control incl. modal interaction, URL-policy rejections, screenshot-to-mount, console/network
  capture with redaction) + e2e (generic-smoke full artifact tree; error-hunt exit 1 with
  high findings). Integration/e2e use the real containerized Chromium — no mocks.
- **CI mode**: `scripts/ci-run.sh <mission>` — headless one-off container via
  `docker compose run` (publishes no ports, no noVNC/X11/supervisord), ephemeral context,
  mission exit code propagated. Verified: generic-smoke headless PASSED exit 0 with artifacts.
- **Profile lifecycle**: ephemeral wipe verified; persistent retention verified across
  graceful restart; `scripts/reset-profile.sh` verified clearing the volume.
  `stop_grace_period: 30s` added after observing Chromium's lazy cookie flush.
- **supervisorctl RPC** enabled (unix socket) for component-level operations.
- **Retention**: `scripts/cleanup-artifacts.sh` honoring `UI_OBSERVER_ARTIFACT_RETENTION_DAYS`.
- **Scripts**: start/stop/reset-profile/cleanup-artifacts/ci-run + smarter verify-workspace.
- **Docs completed**: architecture, security, missions, agent-integration, fedora,
  troubleshooting, README.

## Demonstration record (2026-07-03)

| # | Demo | Result |
|---|---|---|
| 19 | Ephemeral starts clean | cookie `demo_session` set via CDP → restart → **zero cookies** |
| 20 | Persistent retains session | cookie `auth_session` set → flush wait → graceful restart → **retained** |
| 21 | Profile reset | `reset-profile.sh` → cookie **cleared** |
| 22 | Observer failure detected | `supervisorctl stop x11vnc` → `/health` **503 degraded**, component `x11vnc ok=false`; repaired → ok |
| 23 | Target failure ≠ observer failure | `docker compose stop sample-app` → `/health` **200 ok** |

## Security review summary

Loopback-only publishing (noVNC/CDP/API); raw VNC never leaves the container
(x11vnc -localhost); non-root uid-1000 user; no privileged mode, no docker.sock,
no-new-privileges, 4 GB memory limit, 2 GB shm; URL scheme+host allowlist at every
navigation entry; capture-time secret redaction (headers/params/bearer text, bodies never
stored) verified end-to-end; profiles in a named volume, never in Git; artifacts
git-ignored with retention cleanup. Known accepted risk: Chromium sandbox disabled inside
the container (documented rationale in docs-vault/06-Security/Security Model.md).

## Known limitations

- Mission runner uses its own context (same display) instead of the shared CDP session —
  required for native trace/video; both are human-visible.
- Missions are deliberately non-Turing-complete (no conditionals/loops/multi-tab).
- Accessibility inspection is a development aid (heuristics + aria snapshot), not WCAG
  certification; contrast measurement not implemented.
- Persistent-profile cookie durability depends on graceful shutdown (30 s grace configured).
- CDP endpoint is unauthenticated by design — loopback publish is the control.

## Future improvements

- Contrast measurement and focus-indicator detection.
- Slow-request threshold findings (data captured; no finding rule yet).
- Optional WebSocket event stream for agents.
- Visual diffing between runs of the same mission.
