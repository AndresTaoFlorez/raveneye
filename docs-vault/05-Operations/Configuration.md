---
tags: [operations, reference]
---

# Configuration

All configuration is environment-driven. Copy `.env.example` → `.env`; compose interpolates it (shell env overrides `.env`). Changing values requires `docker compose up -d` to recreate.

| Variable | Default | Purpose |
|---|---|---|
| `RAVENEYE_TARGET_URL` | `http://127.0.0.1:8090/overview` | URL the shared browser opens at startup and the default mission target — RavenEye dashboard, host apps, or any authorized URL |
| `RAVENEYE_ALLOWED_HOSTS` | `host.docker.internal,localhost,127.0.0.1` | hostname allow-list enforced by the [URL Policy](../06-Security/URL%20Policy.md) |
| `RAVENEYE_NOVNC_PORT` | `6080` | host loopback port for noVNC ([Display Stack](../02-Architecture/Display%20Stack.md)) |
| `RAVENEYE_CDP_PORT` | `9222` | host loopback port for the [CDP Endpoint](../02-Architecture/CDP%20Endpoint.md) |
| `RAVENEYE_API_PORT` | `8090` | host loopback port for the [Control API](../02-Architecture/Control%20API.md) |
| `RAVENEYE_SAMPLE_APP_PORT` | `3000` | host loopback port for the optional sample app profile |
| `RAVENEYE_VIEWPORT_WIDTH` / `_HEIGHT` | `1440` / `900` | Xvfb screen size and default mission viewport |
| `RAVENEYE_PROFILE_MODE` | `ephemeral` | `ephemeral` or `persistent` — see [Profiles](./Profiles.md) |
| `RAVENEYE_RECORD_VIDEO` | `true` | mission video recording ([Artifacts](../03-Missions/Artifacts.md)) |
| `RAVENEYE_RECORD_TRACE` | `true` | mission trace recording |
| `RAVENEYE_ARTIFACT_RETENTION_DAYS` | `14` | window for `make cleanup` |
| `RAVENEYE_HEADLESS` | `false` | headless missions — see [CI Mode](./CI%20Mode.md) |
| `RAVENEYE_DATA_DIR` | `/artifacts/data` | local data directory for [Application Registry](../02-Architecture/Application%20Registry.md) storage |
| `RAVENEYE_DB_PATH` | `/artifacts/data/raveneye.sqlite` | SQLite database path for observed apps |
| `RAVENEYE_DASHBOARD_DIR` | `/app/apps/dashboard/dist` | static [Local Dashboard](../02-Architecture/Local%20Dashboard.md) build served by the observer |
| `RAVENEYE_MAX_SESSIONS` | `10` | startup fallback for maximum dynamic app sessions; the base session does not count |
| `RAVENEYE_SESSION_DISPLAY_START` | `98` | display number for the first dynamic session |
| `RAVENEYE_SESSION_VNC_PORT_START` | `5901` | first internal x11vnc port for dynamic sessions |
| `RAVENEYE_SESSION_NOVNC_PORT_START` | `6081` | first backend-owned noVNC port for dynamic sessions |
| `RAVENEYE_SESSION_CDP_PORT_START` | `9223` | first backend-owned CDP port for dynamic sessions |

## Precedence details

- Mission target resolution: mission `target_url` → `--target-url` CLI flag → `RAVENEYE_TARGET_URL` ([Mission Runner](../03-Missions/Mission%20Runner.md)).
- `.env` is git-ignored; never commit real hostnames or anything sensitive ([Security Model](../06-Security/Security%20Model.md)).
- The [Application Registry](../02-Architecture/Application%20Registry.md) supplements `.env`; it does not replace startup defaults or global security settings.
- The base noVNC/CDP/API ports stay 6080/9222/8090. Dynamic app sessions use their configured ranges and return real URLs through the [Control API](../02-Architecture/Control%20API.md).
- Dashboard Settings can update the effective dynamic-session limit through `PATCH /api/settings`; that value is persisted in SQLite and survives restart.

## Optional sample app

The sample app is not part of the default stack. Start it only for RavenEye self-tests:

```bash
docker compose --profile sample up -d sample-app
scripts/run-mission.sh generic-smoke --target-url http://sample-app:3000
```

When targeting the sample, include `sample-app` in the relevant allowed-host list.

Related: [Quick Start](./Quick%20Start.md) · [Commands Reference](./Commands%20Reference.md)
