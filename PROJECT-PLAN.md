# UI Observer — Standalone Project Plan

## Context

Build a brand-new, standalone tool at `/home/mothius/Projects/ui-observer` (from `ui-observer-master.prompt.md`) that lets a **coding agent and a human developer observe and control the same real Chromium session** — like a shared screen-share with a browser. The human watches through noVNC at `http://127.0.0.1:6080`; the agent drives the browser through Playwright/CDP and a mission runner that produces structured evidence (screenshots, traces, video, console/network/accessibility captures, findings, reports).

Hard constraints from the spec:
- Built **from scratch** — no code, names, routes, or concepts from any previous repository (the old `tyba-platform` implementation is off-limits; its running container will be stopped to free port 6080, per user approval).
- Generic: works against the bundled sample app, host apps via `host.docker.internal`, and any authorized URL.
- Nothing is "done" until demonstrated against the real Docker environment with visible Chromium, noVNC, Playwright interaction, and generated evidence.
- After plan approval, the plan is materialized as `PROJECT-PLAN.md` in the repo root (per user request) and implementation proceeds phase by phase.

## Environment facts (verified)

- Fedora 44, Docker 29.6.0, Compose v2.40.2, Node v22.22.2, git 2.54.0.
- SELinux **Enforcing** → bind mounts need `:z` labels; documented in `docs-vault/05-Operations/Fedora Notes.md`.
- Port 6080 freed by stopping `tyba-platform-ui-observer-1` (user-approved; old repo files untouched). Ports 3000/9222 free.

## Technology stack (pinned)

| Component | Choice | Notes |
|---|---|---|
| Runtime | Node.js 22 LTS, TypeScript 5.x | npm workspaces monorepo |
| Browser control | Playwright (exact latest stable, pinned at implementation time via `npm view playwright version`) | |
| Observer base image | `mcr.microsoft.com/playwright:v<pinned>-noble` | Chromium preinstalled → no browser downloads at container start |
| Display stack | Xvfb + **Openbox** + x11vnc + noVNC + websockify (Ubuntu noble apt packages) | |
| Process manager | **supervisord** (apt package) | Simple, well-documented; s6 overkill here |
| Missions | YAML + **zod** typed validation (yaml + zod packages) | |
| Sample app | Plain Node 22 `node:http` server, zero dependencies, static HTML/CSS/JS | `node:22-alpine` (pinned digest-level tag) |
| Tests | Vitest, ESLint (flat config), Prettier | |

## Architecture

```
Host (Fedora)                          Docker network
─────────────                          ─────────────────────────────────────
Browser → 127.0.0.1:6080 ──────────►  ui-observer container
Agent   → 127.0.0.1:9222 (CDP) ───►   ├─ supervisord
Agent   → 127.0.0.1:8090 (API) ───►   │   ├─ Xvfb :99 (1440x900)
                                       │   ├─ Openbox
                                       │   ├─ x11vnc (localhost-only, shared)
                                       │   ├─ websockify/noVNC :6080
                                       │   └─ observer-server (Node)
                                       │       ├─ launches visible Chromium on :99
                                       │       │  via Playwright launchPersistentContext
                                       │       │  + --remote-debugging-port=9222
                                       │       ├─ HTTP control API :8090
                                       │       └─ health model
                                       │
                                       └─ sample-app container :3000
Host apps ◄── host.docker.internal (extra_hosts: host-gateway)
```

**Shared-browser design (the core requirement):**
- **Interactive mode**: observer-server launches one long-lived visible Chromium (`launchPersistentContext`, `headless: false`, on DISPLAY `:99`) with CDP exposed on `:9222` (published to loopback only). The human watches via noVNC; any agent (host-side Playwright via `connectOverCDP`, Playwright MCP with `--cdp-endpoint`, or the HTTP control API) drives the **same** browser. This is true shared control and will be demonstrated, not claimed.
- **Evaluation mode**: the mission runner (executed inside the container via `docker compose exec`) launches its **own clean Playwright context** — still on DISPLAY `:99`, so still human-visible in noVNC — with full native trace/video/HAR support. Rationale: `connectOverCDP` has documented feature limitations (e.g. video recording reliability); a runner-owned context gives reproducible, complete evidence. The human still watches the exact browser the runner controls, which satisfies the spec's fallback clause; both modes are documented honestly in `docs-vault/02-Architecture/Architecture Overview.md`.

**Control API (observer-server, Fastify-or-plain-http on :8090, loopback-published):**
`GET /health` (component-by-component: xvfb, wm, x11vnc, novnc, chromium, playwright, artifacts dir — target app health is separate and never fails observer health), `GET /status`, `POST /navigate`, `POST /screenshot`, `GET /console`, `GET /network`, `POST /reset-profile`, `GET /cdp-info`. All target URLs pass the URL policy (scheme allowlist http/https — rejects `file:`/`javascript:`/`data:`; host allowlist from `UI_OBSERVER_ALLOWED_HOSTS`).

## Repository structure

```
ui-observer/
├── compose.yaml                  # ui-observer + sample-app services
├── .env.example  .gitignore  Makefile  README.md  PROJECT-PLAN.md
├── apps/
│   ├── observer-server/          # Dockerfile, supervisord.conf, src/ (server, health, api, browser, policy)
│   ├── mission-runner/           # src/ (cli, schema, actions, evidence, findings, report)
│   ├── shared/                   # url-policy, redaction, types (used by both)
│   └── sample-app/               # Dockerfile, server.mjs, public/ (the 10 validation routes)
├── config/
│   ├── missions/                 # generic-smoke.yaml, responsive-sweep.yaml, error-hunt.yaml, ...
│   └── policies/                 # allowed-hosts.yaml, redaction-rules.yaml
├── docs-vault/                   # Obsidian vault — single documentation source (39 notes)
├── scripts/                      # verify-workspace, start, stop, reset-profile, run-mission, cleanup-artifacts
├── artifacts/                    # runs/<run-id>/... (host-mounted, :z)
├── tests/                        # unit/ integration/ e2e/
└── .status/                      # current.md + per-phase reports
```

## Sample app routes (generic names, zero external deps)

`/` (normal content + nav + "Open dialog" button + modal), `/loading` (delayed skeleton), `/error-page` (controlled 500-style state), `/long-content` (deep scroll + a deliberately overflowing element on `/long-content?overflow=1`), `/responsive` (layout that breaks below 768px intentionally toggleable), `/form` (labeled + unlabeled inputs for a11y findings), `/console-error` (throws + console.error on load), `/network-fail` (fetches a 404/500 + aborted request), `/slow-api` (3s response), plus multi-page nav for back/forward testing.

## Mission format & runner

- YAML → zod schema (`name`, `description`, `target_url?`, `viewport`, `steps[]`, `checks[]`). Unknown actions/checks fail validation with clear errors.
- All 22 required actions (`goto navigate reload back forward click fill type press select check uncheck hover scroll wait wait_for_ready wait_for_selector screenshot inspect_accessibility capture_console capture_network check_horizontal_overflow set_viewport`). Locators via role/name/selector/text.
- Checks → findings: `no_unhandled_page_errors`, `no_critical_console_errors`, `no_unexpected_failed_requests`, `no_horizontal_overflow` (via `document.scrollingElement.scrollWidth > innerWidth` + per-element geometry), `interactive_controls_visible` (bounding-box + visibility of role button/link/input), `keyboard_navigation_available` (Tab traversal produces visible focus).
- Every run writes `artifacts/runs/<run-id>/` with the full spec layout: `manifest.json` (run_id, mission, target, timestamps, git commit, versions, viewport, profile mode, status, artifact paths), `findings.json` (all spec fields incl. category/severity/reproduction/evidence/confidence), `actions.json`, `console.json`, `page-errors.json`, `network.json` (redacted), `accessibility.json`, `trace.zip`, `video/`, `screenshots/`, `report.md`.
- Exit codes: `0` pass, `1` critical/high findings, `2` mission error (bad YAML, unreachable target), `3` observer/browser failure.
- Redaction (shared lib, unit-tested): authorization/cookie/set-cookie headers, `token|key|secret|password|session`-like query params and body fields; bodies dropped by default.

## Security decisions

noVNC/CDP/API published to `127.0.0.1` only · no raw VNC port published (x11vnc `-localhost` inside container) · no privileged mode, no docker.sock, `no-new-privileges`, `shm_size: 2gb`, mem/cpu limits · non-root container user (`pwuser` from the Playwright image) · URL scheme + host allowlist enforced at every navigation entry point (API, runner, missions) · secrets never in image or git · artifact retention cleanup (`UI_OBSERVER_ARTIFACT_RETENTION_DAYS`) · profile lifecycle: `ephemeral` (default, wiped per run) / `persistent` (named volume, explicit `make reset-profile`).

## Implementation phases (each ends with a real demonstrated milestone + `.status/` report + git commit)

**Phase 0 — Scaffold** (≈30 min): stop old container; `git init`; write `PROJECT-PLAN.md` (this plan), README skeleton, `.gitignore`, `.env.example`, Makefile, npm workspaces, ESLint/Prettier/Vitest config, `scripts/verify-workspace.sh`.

**Phase 1 — Visible browser**: sample-app (all routes) + observer Dockerfile (Playwright base + xvfb/openbox/x11vnc/novnc/websockify/supervisord) + supervisord config + minimal observer-server that launches visible Chromium at `UI_OBSERVER_TARGET_URL` + `/health`. **Gate: I verify via `curl 127.0.0.1:6080` + a Playwright-CDP screenshot showing Chromium rendering the sample app, then the user confirms visually in their own browser before Phase 2.**

**Phase 2 — Programmatic control**: CDP exposure hardened, control API endpoints, console/network ring buffers with redaction, basic CLI (`observer navigate|screenshot|console|network`), URL policy enforcement. Demo: drive the visible browser from the host over CDP + API; capture screenshot/console/network evidence; open a throwaway host HTTP server via `host.docker.internal`.

**Phase 3 — Mission runner**: zod schema, action executor, evidence pipeline, findings, `report.md` generation, sample missions (`generic-smoke`, `responsive-sweep`, `error-hunt`), `make mission MISSION=...`. Demo: run `generic-smoke` against sample-app → full artifact tree incl. trace.zip + video; run `error-hunt` → console/network findings actually generated.

**Phase 4 — Agent integration**: `docs-vault/04-Agents/Agent Integration.md` (CDP endpoint for any Playwright client, Playwright MCP `--cdp-endpoint` config example, HTTP API, CLI, mission repeat loop; Codex documented as one example, architecture agent-neutral). Demo: the observe → evidence → fix (sample app bug I plant) → re-run mission → compare findings loop, end to end.

**Phase 5 — Hardening + tests + docs**: full unit suite (schema, URL policy, redaction, findings), integration tests (real Chromium: control, artifacts, health), e2e mission test against sample-app, Docker smoke test script; CI headless mode (`UI_OBSERVER_HEADLESS=1`, no noVNC publish, ephemeral only, non-zero exit on critical findings); persistent-profile demo (login state survives restart, then `make reset-profile` clears it); observer-vs-target health separation demo (stop sample-app → observer stays healthy); artifact retention; finish all docs incl. `docs-vault/05-Operations/Fedora Notes.md` (SELinux `:z`, host-gateway, firewalld, shm); final `.status/current.md` covering the 23 mandatory demonstrations with evidence paths.

## Verification approach

- Every phase: `docker compose build && up`, then **behavioral proof** (curl health, CDP screenshot saved to `artifacts/`, mission artifacts on disk) — never "files exist".
- `make test` runs unit + integration (integration/e2e use the real containerized Chromium via CDP / `compose exec`).
- All 23 mandatory demonstrations tracked as a checklist in `.status/current.md`, each with the command run and the evidence artifact path.
- Honest limitations documented (e.g., any `connectOverCDP` recording caveats, a11y inspection is a dev aid not certification).
