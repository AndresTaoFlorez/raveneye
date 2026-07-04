---
tags: [architecture, operations]
---

# Docker Design

Two services in `compose.yaml`:

| Service | Image | Ports (all host-loopback) |
|---|---|---|
| `ui-observer` | built from `mcr.microsoft.com/playwright:v1.61.1-noble` | 6080 noVNC · 9222 CDP · 8090 API |
| `sample-app` | built from `node:22.22.0-alpine3.22` | 3000 |

## Why the Playwright base image

It ships Node 22 **and the exact Chromium build matching Playwright 1.61.1** — browsers are baked into the image, never downloaded at container start. Upgrades must move the npm package version and the image tag together (see [[Project History]] for the pinning rationale).

On top of the base, the observer Dockerfile adds the [[Display Stack]] packages (xvfb, openbox, x11vnc, novnc, websockify, socat, supervisor) plus `scrot` for display captures.

## Hardening choices

- **Non-root**: `pwuser` re-uid'd to 1000 so files written to the artifacts mount belong to the host developer.
- `security_opt: no-new-privileges:true`, no privileged mode, no Docker socket.
- `shm_size: 2gb` (Chromium crashes with tiny `/dev/shm`), memory limit 4 GB.
- `stop_grace_period: 30s` — Chromium flushes profile data lazily; see [[Profiles]].
- Details and rationale: [[Security Model]].

## Volumes

| Mount | Purpose |
|---|---|
| `./artifacts:/artifacts:z` | evidence output ([[Artifacts]]); `:z` for SELinux, see [[Fedora Notes]] |
| `./config:/config:ro,z` | mission YAML, read-only ([[Mission Format]]) |
| `ui-observer-profile:/browser-profile` | named volume for the persistent profile ([[Profiles]]) |

## Reaching targets

- Compose services by name: `http://sample-app:3000` (the [[Sample App]]).
- Host applications: `http://host.docker.internal:<port>` via `extra_hosts: host-gateway` — demonstrated with a live host app (see [[Project History]]).
- Containers from other compose projects: attach them with `docker network connect ui-observer_default <container>` — full recipe in [[Observing Your Own App]].
- Anything else must pass the [[URL Policy]].

Related: [[Architecture Overview]] · [[Commands Reference]] · [[CI Mode]]
