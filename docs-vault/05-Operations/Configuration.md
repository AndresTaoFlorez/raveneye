---
tags: [operations, reference]
---

# Configuration

All configuration is environment-driven. Copy `.env.example` → `.env`; compose interpolates it (shell env overrides `.env`). Changing values requires `docker compose up -d` to recreate.

| Variable | Default | Purpose |
|---|---|---|
| `RAVENEYE_TARGET_URL` | `http://sample-app:3000` | URL the shared browser opens at startup and the default mission target — [[Sample App]], host apps, or any authorized URL |
| `RAVENEYE_ALLOWED_HOSTS` | `sample-app,host.docker.internal,localhost,127.0.0.1` | hostname allow-list enforced by the [[URL Policy]] |
| `RAVENEYE_NOVNC_PORT` | `6080` | host loopback port for noVNC ([[Display Stack]]) |
| `RAVENEYE_CDP_PORT` | `9222` | host loopback port for the [[CDP Endpoint]] |
| `RAVENEYE_API_PORT` | `8090` | host loopback port for the [[Control API]] |
| `RAVENEYE_SAMPLE_APP_PORT` | `3000` | host loopback port for the sample app |
| `RAVENEYE_VIEWPORT_WIDTH` / `_HEIGHT` | `1440` / `900` | Xvfb screen size and default mission viewport |
| `RAVENEYE_PROFILE_MODE` | `ephemeral` | `ephemeral` or `persistent` — see [[Profiles]] |
| `RAVENEYE_RECORD_VIDEO` | `true` | mission video recording ([[Artifacts]]) |
| `RAVENEYE_RECORD_TRACE` | `true` | mission trace recording |
| `RAVENEYE_ARTIFACT_RETENTION_DAYS` | `14` | window for `make cleanup` |
| `RAVENEYE_HEADLESS` | `false` | headless missions — see [[CI Mode]] |

## Precedence details

- Mission target resolution: mission `target_url` → `--target-url` CLI flag → `RAVENEYE_TARGET_URL` ([[Mission Runner]]).
- `.env` is git-ignored; never commit real hostnames or anything sensitive ([[Security Model]]).
- Ports only change the **host** binding; inside the container the services always use 6080/9222/8090.

Related: [[Quick Start]] · [[Commands Reference]]
