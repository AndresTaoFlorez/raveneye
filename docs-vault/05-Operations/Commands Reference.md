---
tags: [operations, reference]
---

# Commands Reference

## Make targets

| Target | Action |
|---|---|
| `make build` | build both Docker images ([Docker Design](../02-Architecture/Docker%20Design.md)) |
| `make up` / `make down` / `make restart` | lifecycle |
| `make logs` | follow container logs |
| `make open` | print the noVNC URL |
| `make health` | pretty [Health Model](../02-Architecture/Health%20Model.md) report |
| `make smoke` | run the generic-smoke mission |
| `make mission MISSION=<name>` | run `config/missions/<name>.yaml` ([Mission Runner](../03-Missions/Mission%20Runner.md)) |
| `make artifacts` | list recent runs |
| `make trace RUN_ID=<run-id>` | open a recorded Playwright trace ([Artifacts](../03-Missions/Artifacts.md)) |
| `make reset-profile` | wipe the persistent profile ([Profiles](./Profiles.md)) |
| `make cleanup` | delete runs older than the retention window |
| `make test` | full test suite ([Testing](./Testing.md)) |
| `make lint` / `make format` | ESLint / Prettier |
| `make verify` | workspace prerequisites check |

## Scripts

| Script | Action |
|---|---|
| `scripts/start.sh` | up + wait until healthy, prints the noVNC URL |
| `scripts/stop.sh` | compose down |
| `scripts/observer <cmd>` | interactive control, see [Observer CLI](../04-Agents/Observer%20CLI.md) |
| `scripts/run-mission.sh <name>` | mission inside the running container, propagates exit code |
| `scripts/ci-run.sh <name>` | headless one-off mission, see [CI Mode](./CI%20Mode.md) |
| `scripts/reset-profile.sh` | stop → clear profile volume → restart |
| `scripts/cleanup-artifacts.sh` | retention cleanup ([Configuration](./Configuration.md)) |
| `scripts/verify-workspace.sh` | host prerequisites |

## Component-level operations

```bash
docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf status
docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf restart <program>
```

Programs: `xvfb`, `openbox`, `x11vnc`, `novnc`, `cdp-proxy`, `observer-server` — see [Display Stack](../02-Architecture/Display%20Stack.md).
