# RavenEye

_See what tests can’t_.

A standalone development tool that lets a **coding agent and a human developer watch and control real local Chromium sessions** — from the historical shared base browser to isolated app workspaces.

```text
Human developer
        │ watches through noVNC (http://127.0.0.1:6080)
        ▼
Visible Chromium session(s) (in Docker)
        ▲
        │ controlled through Playwright / CDP / HTTP API / missions
Coding agent
```

The agent navigates, clicks, types, resizes, screenshots, records traces and video, and captures console, network, and accessibility evidence — so it can detect and fix the class of problems that code inspection and unit tests miss: broken layouts, hidden controls, horizontal overflow, confusing flows, console errors, failed requests.

## Quick start

```bash
cp .env.example .env
make build
make up          # starts only raveneye
make open        # prints the noVNC URL
make health
```

Open `http://127.0.0.1:6080` and you will see the base Chromium session displaying RavenEye's local dashboard. Open `http://127.0.0.1:8090/overview` directly for the dashboard: Overview app registry, live session preview, sessions, mission runs, settings, and docs.

`docker compose up -d` and `make up` intentionally start only `raveneye`. The bundled sample app is available only when requested:

```bash
docker compose --profile sample up -d sample-app
scripts/run-mission.sh generic-smoke --target-url http://sample-app:3000
```

## Fast fix loop

```bash
make up
make health
scripts/observer navigate http://host.docker.internal:<port>/
scripts/observer screenshot before-fix
scripts/observer console
scripts/observer network --problems
# fix the target app in its own repo, then repeat the same screenshot/mission
```

For repeatable evidence, create a mission in `config/missions/` and run `make mission MISSION=<name>`.

## Pointing it at your application

Use the dashboard Overview at `http://127.0.0.1:8090/overview` to register apps and open isolated observed sessions. `.env` remains the startup fallback:

| Target | URL |
|---|---|
| RavenEye dashboard | `http://127.0.0.1:8090/overview` |
| App running on the host | `http://host.docker.internal:<port>` |
| App in another compose network | attach the service and use its name |
| Bundled sample app, optional | start with `docker compose --profile sample up -d sample-app`, then use `http://sample-app:3000` |

Only hosts listed in `RAVENEYE_ALLOWED_HOSTS` are reachable; `file:`, `javascript:` and `data:` URLs are always rejected.

## Commands

```bash
make build / up / down / restart / logs   # lifecycle
make open                                 # print the noVNC URL
make health                               # component-by-component observer health
make smoke                                # optional sample-oriented validation mission
make mission MISSION=<name>               # run config/missions/<name>.yaml
make artifacts                            # list recent runs
make trace RUN_ID=<run-id>                # open a recorded Playwright trace
make reset-profile                        # wipe the persistent browser profile
make cleanup                              # delete runs older than retention window
make test                                 # unit + integration tests
```

## Documentation

**[docs-vault/](docs-vault/Index.md)** is the single source of truth — a full user guide as an
Obsidian-ready Markdown vault using standard `[label](path.md)` links. Key entry points:

- [Quick Start](docs-vault/05-Operations/Quick%20Start.md) · [Observing Your Own App](docs-vault/05-Operations/Observing%20Your%20Own%20App.md)
- [Architecture Overview](docs-vault/02-Architecture/Architecture%20Overview.md) · [Mission Format](docs-vault/03-Missions/Mission%20Format.md)
- [Agent Integration](docs-vault/04-Agents/Agent%20Integration.md) — and **[AGENTS.md](AGENTS.md)** for the agents themselves
- [Security Model](docs-vault/06-Security/Security%20Model.md) · [Fedora Notes](docs-vault/05-Operations/Fedora%20Notes.md) · [Troubleshooting](docs-vault/05-Operations/Troubleshooting.md)

## Repository layout

```text
apps/observer-server/   container: Xvfb + Chromium + noVNC + control API
apps/mission-runner/    declarative mission executor producing evidence
apps/shared/            URL policy, redaction, shared types
apps/sample-app/        generic zero-dependency app used to validate the observer
config/missions/        mission YAML files
artifacts/runs/<id>/    evidence: report, findings, trace, video, screenshots
.status/                phase-by-phase implementation status reports
```

## Status

See [.status/current.md](.status/current.md) for implementation progress and demonstrated capabilities.
