---
tags: [architecture, operations]
---

# Docker Design

`compose.yaml` defines RavenEye plus an optional validation app. The default stack starts only `raveneye`.

| Service | Image | Ports (all host-loopback) |
|---|---|---|
| `raveneye` | built from `mcr.microsoft.com/playwright:v1.61.1-noble` | 6080 noVNC · 9222 CDP · 8090 API |
| `sample-app` | built from `node:22.22.0-alpine3.22`; profile `sample` only | 3000 |

Use the sample profile only for self-tests:

```bash
docker compose --profile sample up -d sample-app
```

## Why the Playwright base image

It ships Node 22 **and the exact Chromium build matching Playwright 1.61.1** — browsers are baked into the image, never downloaded at container start. Upgrades must move the npm package version and the image tag together (see [Project History](../01-Overview/Project%20History.md) for the pinning rationale).

On top of the base, the observer Dockerfile adds the [Display Stack](./Display%20Stack.md) packages (xvfb, openbox, x11vnc, novnc, websockify, socat, supervisor) plus `scrot` for display captures.

## Hardening choices

- **Non-root**: `pwuser` re-uid'd to 1000 so files written to the artifacts mount belong to the host developer.
- `security_opt: no-new-privileges:true`, no privileged mode, no Docker socket.
- `shm_size: 2gb` (Chromium crashes with tiny `/dev/shm`), memory limit 4 GB.
- `stop_grace_period: 30s` — Chromium flushes profile data lazily; see [Profiles](../05-Operations/Profiles.md).
- Details and rationale: [Security Model](../06-Security/Security%20Model.md).

## Volumes

| Mount | Purpose |
|---|---|
| `./artifacts:/artifacts:z` | evidence output ([Artifacts](../03-Missions/Artifacts.md)); `:z` for SELinux, see [Fedora Notes](../05-Operations/Fedora%20Notes.md) |
| `./config:/config:ro,z` | mission YAML, read-only ([Mission Format](../03-Missions/Mission%20Format.md)) |
| `raveneye-profile:/browser-profile` | named volume for the persistent profile ([Profiles](../05-Operations/Profiles.md)) |

## Reaching targets

- Optional compose services by name: `http://sample-app:3000` after starting the `sample` profile.
- Host applications: `http://host.docker.internal:<port>` via `extra_hosts: host-gateway` — demonstrated with a live host app (see [Project History](../01-Overview/Project%20History.md)).
- Containers from other compose projects: attach them with `docker network connect raveneye_default <container>` — full recipe in [Observing Your Own App](../05-Operations/Observing%20Your%20Own%20App.md).
- Anything else must pass the [URL Policy](../06-Security/URL%20Policy.md).

Related: [Architecture Overview](./Architecture%20Overview.md) · [Commands Reference](../05-Operations/Commands%20Reference.md) · [CI Mode](../05-Operations/CI%20Mode.md)
