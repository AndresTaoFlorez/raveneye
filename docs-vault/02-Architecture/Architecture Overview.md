---
tags: [architecture]
---

# Architecture Overview

```
Host (Fedora)                            raveneye container
─────────────                            ─────────────────────────────────
Browser → 127.0.0.1:6080 ──────────────► websockify/noVNC → x11vnc → Xvfb :99
Agent   → 127.0.0.1:9222 (CDP) ────────► socat → Chromium devtools
Agent   → 127.0.0.1:8090 (API) ────────► observer-server (Node/Playwright)
Agent   → run-mission.sh ── compose exec ─► mission-runner (own context, same display)

                                         sample-app container :3000
Host apps ◄──── host.docker.internal (extra_hosts: host-gateway)
```

Two containers (see [Docker Design](./Docker%20Design.md)):

- **raveneye** — the [Display Stack](./Display%20Stack.md) plus the [Observer Server](./Observer%20Server.md), managed by supervisord as a non-root user.
- **sample-app** — the [Sample App](./Sample%20App.md) used for validation.

## Control planes

| Surface | Port | Notes |
|---|---|---|
| noVNC (human) | 6080 | [Display Stack](./Display%20Stack.md) |
| CDP (agent, full control) | 9222 | [CDP Endpoint](./CDP%20Endpoint.md) |
| HTTP API (agent, simple ops) | 8090 | [Control API](./Control%20API.md) |
| Mission runner | — | via `docker compose exec`, see [Mission Runner](../03-Missions/Mission%20Runner.md) |

All ports bind to `127.0.0.1` on the host — see [Security Model](../06-Security/Security%20Model.md).

## Data flow of a mission

YAML → validation ([Mission Format](../03-Missions/Mission%20Format.md)) → headed context on display :99 → steps execute ([Actions Reference](../03-Missions/Actions%20Reference.md)) → continuous evidence capture with [Secret Redaction](../06-Security/Secret%20Redaction.md) → inspections (overflow geometry, aria snapshot, control visibility, Tab order) → [Checks Reference](../03-Missions/Checks%20Reference.md) → [Findings](../03-Missions/Findings.md) → [Artifacts](../03-Missions/Artifacts.md) (report, manifest, trace, video).

## Monorepo layout

```
apps/observer-server/   image + shared-browser server + Control API + health
apps/mission-runner/    schema, executor, findings, reports
apps/shared/            URL policy, redaction, evidence types
apps/sample-app/        zero-dependency validation app
config/missions/        mission YAML (mounted read-only)
artifacts/              evidence output (host-mounted)
```

Related: [Shared Browser Model](../01-Overview/Shared%20Browser%20Model.md) · [Health Model](./Health%20Model.md) · [Project History](../01-Overview/Project%20History.md)
