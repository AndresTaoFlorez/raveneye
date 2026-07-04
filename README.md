# ui-observer

A standalone development tool that lets a **coding agent and a human developer watch and control the same real Chromium session** — like a screen-share with a browser.

```text
Human developer
        │ watches through noVNC (http://127.0.0.1:6080)
        ▼
Shared visible Chromium session (in Docker)
        ▲
        │ controlled through Playwright / CDP / HTTP API / missions
Coding agent
```

The agent navigates, clicks, types, resizes, screenshots, records traces and video, and captures console, network, and accessibility evidence — so it can detect and fix the class of problems that code inspection and unit tests miss: broken layouts, hidden controls, horizontal overflow, confusing flows, console errors, failed requests.

## Quick start

```bash
cp .env.example .env
make build
make up
make open        # prints the noVNC URL
make health
make smoke       # runs the generic-smoke mission against the sample app
```

Open `http://127.0.0.1:6080` and you will see Chromium displaying the target application (the bundled sample app by default).

## Pointing it at your application

Set `UI_OBSERVER_TARGET_URL` in `.env`:

| Target | URL |
|---|---|
| Bundled sample app | `http://sample-app:3000` |
| App running on the host | `http://host.docker.internal:<port>` |
| App in another compose network | attach the service and use its name |

Only hosts listed in `UI_OBSERVER_ALLOWED_HOSTS` are reachable; `file:`, `javascript:` and `data:` URLs are always rejected.

## Commands

```bash
make build / up / down / restart / logs   # lifecycle
make open                                 # print the noVNC URL
make health                               # component-by-component observer health
make smoke                                # quick validation mission
make mission MISSION=<name>               # run config/missions/<name>.yaml
make artifacts                            # list recent runs
make trace RUN_ID=<run-id>                # open a recorded Playwright trace
make reset-profile                        # wipe the persistent browser profile
make cleanup                              # delete runs older than retention window
make test                                 # unit + integration tests
```

## Documentation

- [Architecture](docs/architecture.md) — shared-browser design, processes, ports
- [Missions](docs/missions.md) — declarative YAML mission format
- [Agent integration](docs/agent-integration.md) — CDP, MCP, HTTP API, CLI
- [Security](docs/security.md) — loopback binding, URL policy, redaction
- [Fedora notes](docs/fedora.md) — SELinux labels, host-gateway, firewall
- [Troubleshooting](docs/troubleshooting.md)

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
