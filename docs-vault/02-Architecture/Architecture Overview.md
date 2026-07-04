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

Two containers (see [[Docker Design]]):

- **raveneye** — the [[Display Stack]] plus the [[Observer Server]], managed by supervisord as a non-root user.
- **sample-app** — the [[Sample App]] used for validation.

## Control planes

| Surface | Port | Notes |
|---|---|---|
| noVNC (human) | 6080 | [[Display Stack]] |
| CDP (agent, full control) | 9222 | [[CDP Endpoint]] |
| HTTP API (agent, simple ops) | 8090 | [[Control API]] |
| Mission runner | — | via `docker compose exec`, see [[Mission Runner]] |

All ports bind to `127.0.0.1` on the host — see [[Security Model]].

## Data flow of a mission

YAML → validation ([[Mission Format]]) → headed context on display :99 → steps execute ([[Actions Reference]]) → continuous evidence capture with [[Secret Redaction]] → inspections (overflow geometry, aria snapshot, control visibility, Tab order) → [[Checks Reference]] → [[Findings]] → [[Artifacts]] (report, manifest, trace, video).

## Monorepo layout

```
apps/observer-server/   image + shared-browser server + Control API + health
apps/mission-runner/    schema, executor, findings, reports
apps/shared/            URL policy, redaction, evidence types
apps/sample-app/        zero-dependency validation app
config/missions/        mission YAML (mounted read-only)
artifacts/              evidence output (host-mounted)
```

Related: [[Shared Browser Model]] · [[Health Model]] · [[Project History]]
