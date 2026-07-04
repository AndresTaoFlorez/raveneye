# Architecture

## The shared-browser model

ui-observer runs **one visible Chromium session** inside a container. Humans and agents
share it:

```
Host (Fedora)                           ui-observer container
─────────────                           ─────────────────────────────────
Browser → 127.0.0.1:6080 ─────────────► websockify/noVNC → x11vnc → Xvfb :99
Agent   → 127.0.0.1:9222 (CDP) ───────► socat → Chromium devtools (:9221)
Agent   → 127.0.0.1:8090 (API) ───────► observer-server (Node/Playwright)
Agent   → run-mission.sh ─── compose exec ─► mission-runner (own context, same display)

                                        sample-app container :3000
Host apps ◄─── host.docker.internal (extra_hosts: host-gateway)
```

### Processes (supervisord, in priority order)

| Program | Role |
|---|---|
| `xvfb` | virtual X display `:99`, sized by `UI_OBSERVER_VIEWPORT_*` |
| `openbox` | window manager (window decorations, stacking) |
| `x11vnc` | VNC server on the display — `-localhost`, never published |
| `novnc` | websockify bridging :6080 → VNC, the only human-facing port |
| `cdp-proxy` | socat republishing Chromium's loopback CDP on the container interface |
| `observer-server` | launches the shared Chromium (`launchPersistentContext`, headed), serves the control API, watches browser liveness |

If the shared browser dies (crash, closed window), observer-server exits and supervisord
relaunches it with a fresh session.

### Two control modes, both visible

1. **Interactive (shared session)** — agents attach to the *same* browser the human watches:
   Playwright `connectOverCDP('http://127.0.0.1:9222')`, Playwright MCP `--cdp-endpoint`,
   the HTTP API, or `scripts/observer`. True shared control, demonstrated in
   `.status/phase-2-control.md`.
2. **Evaluation (missions)** — `mission-runner` creates its **own clean Playwright context**
   on the same X display: still watchable live in noVNC, but with native trace/video/HAR
   recording, reproducible viewport, and ephemeral state. This is deliberate:
   `connectOverCDP` contexts do not support the full recording feature set.

## Repository layout

```
apps/observer-server/   container image + shared-browser server + control API + health
apps/mission-runner/    YAML mission schema, action executor, findings, reports
apps/shared/            URL policy, secret redaction, evidence types (used by both)
apps/sample-app/        zero-dependency validation app ("Meridian Notes")
config/missions/        mission definitions (mounted read-only at /config)
artifacts/              host-mounted evidence (screenshots/, runs/<run-id>/)
```

## Data flow of a mission

```
YAML → zod validation → headed context (display :99) → steps execute
   → console/page-error/network listeners (redacted at capture time)
   → inspections (overflow geometry, aria snapshot, control visibility, Tab order)
   → checks → findings.json → report.md + manifest.json + trace.zip + video/
```

Exit codes: `0` pass · `1` critical/high findings or step failure · `2` mission/config
error · `3` browser failure.

## Health model

`GET /health` checks only observer components (xvfb, window-manager, x11vnc, novnc,
chromium-playwright, cdp, artifacts-dir). Target-application state is intentionally
excluded — a dead target never marks the observer unhealthy (demonstrated in
`.status/phase-5-hardening.md`). Mission results are a third, separate signal (exit codes).

## Versions

| Component | Version |
|---|---|
| Base image | `mcr.microsoft.com/playwright:v1.61.1-noble` |
| Playwright / Chromium | 1.61.1 / 149.0.7827.55 |
| Node.js | 22 (image + host) |
| sample-app image | `node:22.22.0-alpine3.22` |

Upgrading Playwright: bump the version in `apps/*/package.json` **and** the Dockerfile
base tag together — they must match so the baked-in browsers are the ones the library
expects. Then `npm install && make build && make test`.
