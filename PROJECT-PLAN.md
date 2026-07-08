# RavenEye Project Plan

## Context

RavenEye is a local-first visual observer for coding agents and humans. It runs real Chromium sessions in Docker, streams them through noVNC, exposes CDP for agents, and records mission evidence for reproducible UI review.

The current workstream is:

```text
RavenEye v0.2/v0.3 — Local Dashboard + App Registry + Real Multi Observer
```

The active branch is:

```text
feature/local-dashboard-app-registry
```

Do not merge to `main` automatically.

## Current architecture

```text
Host
  127.0.0.1:6080  base noVNC
  127.0.0.1:8090  Control API + dashboard
  127.0.0.1:9222  base CDP
  127.0.0.1:6081-6100 dynamic noVNC ports
  127.0.0.1:9223-9232 dynamic CDP ports

Container raveneye
  observer-server
    SessionManager
      base session
      dynamic app sessions
    AppRegistry SQLite
    Settings SQLite
    Control API
    Dashboard static assets
  sample-app
```

## Implemented

- React dashboard served at `http://127.0.0.1:8090/`.
- Dashboard Onion structure:
  - `domain`
  - `application`
  - `infrastructure`
  - `presentation`
- Redux Toolkit in presentation.
- CSS Modules for views/components.
- GSAP for modal and entrance microinteractions.
- Overview-first app registry UX:
  - app creation/edit/delete;
  - clickable app tiles;
  - selected-session noVNC preview;
  - icon-only preview/open actions;
  - custom confirmation modal, no native `window.confirm`.
- Sessions view backed by real backend sessions.
- Mission Runs view backed by `artifacts/runs`.
- Settings view with persisted max dynamic app sessions.
- Docs view backed by `docs-vault`, with improved Markdown rendering.
- Standard Markdown links in `docs-vault` instead of Obsidian wikilinks.
- SQLite persistence:
  - `observed_apps`;
  - `observer_sessions`;
  - `raveneye_settings`.
- API routes:
  - `/api/apps`;
  - `/api/apps/:id/open`;
  - `/api/sessions`;
  - `/api/runs`;
  - `/api/docs`;
  - `/api/settings`.
- Multi Observer dynamic app sessions:
  - isolated Xvfb;
  - isolated x11vnc;
  - isolated noVNC/websockify;
  - isolated Chromium app window;
  - isolated CDP endpoint.
- Backend-owned session URLs:
  - dashboard uses `watchUrl`/`session.novncUrl`;
  - dashboard does not fabricate `6080/?app=id`.
- Dynamic session limit:
  - default 10;
  - base session does not count;
  - effective value persisted in SQLite and editable from Settings.

## Constraints

- Keep RavenEye local-first and loopback-only.
- Keep noVNC, CDP, and API ports bound to `127.0.0.1`.
- Never store secrets, API keys, cookies, or credentials in the registry/settings database.
- Preserve URL policy for API/CLI/mission navigation.
- Keep `docs-vault/` as the single human-facing documentation source.
- Keep Playwright version and Docker base image aligned.

## Current limitations

- noVNC gateway routing under a single `6080` path is not implemented yet.
- Dynamic sessions currently use distinct loopback noVNC ports returned by backend.
- CDP path routing is intentionally not attempted.
- Registry entries do not start/stop target application processes.
- Authentication and remote/cloud deployment are out of scope.

## Next phases

### Phase A — Dashboard polish

- Keep app registry workflows concentrated in Overview.
- Improve Docs search/filtering.
- Add richer session state feedback for failed/stopped sessions.
- Add copy buttons for watch/CDP URLs.

### Phase B — noVNC gateway

Target routes:

```text
http://127.0.0.1:6080/
http://127.0.0.1:6080/apps/:appId/novnc
http://127.0.0.1:6080/sessions/:sessionId/novnc
```

Gateway requirements:

- serve noVNC assets;
- map app/session IDs to live VNC backends;
- generate autoconnect pages;
- bridge WebSocket to TCP VNC;
- return 404 for missing sessions;
- return 410 or clear error for dead sessions.

### Phase C — Verification hardening

- Add integration coverage for two dynamic sessions.
- Add visual checks for dashboard Overview and Docs.
- Keep smoke mission passing after every phase.

## Validation commands

```bash
npm run lint
npm run build
npm run test:unit
docker compose build
docker compose up -d
curl -fsS http://127.0.0.1:8090/health
docker compose exec raveneye node /app/apps/mission-runner/dist/cli.js run /config/missions/generic-smoke.yaml
```

If `make` is installed, these should also work:

```bash
make build
make up
make health
make smoke
```
