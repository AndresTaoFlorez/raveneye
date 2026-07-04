---
tags: [operations, reference]
---

# Commands Reference

## Make targets

| Target | Action |
|---|---|
| `make build` | build both Docker images ([[Docker Design]]) |
| `make up` / `make down` / `make restart` | lifecycle |
| `make logs` | follow container logs |
| `make open` | print the noVNC URL |
| `make health` | pretty [[Health Model]] report |
| `make smoke` | run the generic-smoke mission |
| `make mission MISSION=<name>` | run `config/missions/<name>.yaml` ([[Mission Runner]]) |
| `make artifacts` | list recent runs |
| `make trace RUN_ID=<run-id>` | open a recorded Playwright trace ([[Artifacts]]) |
| `make reset-profile` | wipe the persistent profile ([[Profiles]]) |
| `make cleanup` | delete runs older than the retention window |
| `make test` | full test suite ([[Testing]]) |
| `make lint` / `make format` | ESLint / Prettier |
| `make verify` | workspace prerequisites check |

## Scripts

| Script | Action |
|---|---|
| `scripts/start.sh` | up + wait until healthy, prints the noVNC URL |
| `scripts/stop.sh` | compose down |
| `scripts/observer <cmd>` | interactive control, see [[Observer CLI]] |
| `scripts/run-mission.sh <name>` | mission inside the running container, propagates exit code |
| `scripts/ci-run.sh <name>` | headless one-off mission, see [[CI Mode]] |
| `scripts/reset-profile.sh` | stop → clear profile volume → restart |
| `scripts/cleanup-artifacts.sh` | retention cleanup ([[Configuration]]) |
| `scripts/verify-workspace.sh` | host prerequisites |

## Component-level operations

```bash
docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf status
docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf restart <program>
```

Programs: `xvfb`, `openbox`, `x11vnc`, `novnc`, `cdp-proxy`, `observer-server` — see [[Display Stack]].
