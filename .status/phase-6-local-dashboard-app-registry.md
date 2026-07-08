# RavenEye v0.2/v0.3 — Local Dashboard + App Registry + Multi Observer

Updated: 2026-07-08

## Scope

This phase adds a local dashboard, persistent observed-app registry, explicit session model, and real dynamic app sessions while preserving the existing base browser, Control API, noVNC, CDP, missions, artifacts, redaction, and URL policy.

## Implemented

- React dashboard in `apps/dashboard/` using Redux Toolkit, CSS Modules, and GSAP.
- Frontend Onion structure: `domain`, `application`, `infrastructure`, `presentation`.
- Static dashboard served by `observer-server` at `http://127.0.0.1:8090/`.
- SQLite-backed `observed_apps` registry stored by default at `/artifacts/data/raveneye.sqlite`.
- SQLite-backed `observer_sessions` lifecycle rows in the same local database.
- New `/api/apps` CRUD routes and `/api/apps/:id/open`.
- New `/api/sessions`, `/api/sessions/:id`, and dynamic session stop support.
- New `/api/runs` and `/api/runs/:runId` summaries from existing run folders.
- New `/api/docs` and `/api/docs/:slug` routes backed directly by `docs-vault/`.
- Dashboard Docs view for browsing the packaged docs-vault from the local UI.
- Dashboard views for Overview, Observed Apps, Sessions, Mission Runs, Settings, and Docs.
- `POST /api/apps/:id/open` returns `session`, `watchUrl`, and `cdpUrl`.
- Frontend consumes backend-owned `watchUrl`/`session.novncUrl`; the old fabricated `6080?app=id` helper was removed.
- Dynamic app sessions get isolated Xvfb, x11vnc, websockify/noVNC, Chromium, and CDP ports.
- `RAVENEYE_MAX_SESSIONS` now means maximum dynamic app sessions; the base session does not count.
- Stable seeded `Sample App` registry entry pointing at `http://sample-app:3000`.
- Clean repo defaults in `.env`: Sample App target, local allow-list, ephemeral profile.
- Effective URL policy for registered apps: global allowed hosts plus app allowed hosts.
- Unit tests for app validation, persistence, URL host merging, and API app routes.
- Documentation in `docs-vault/` and agent instructions updated.

## Preserved

- `.env` startup fallback through `RAVENEYE_TARGET_URL` and `RAVENEYE_ALLOWED_HOSTS`; committed defaults stay project-agnostic.
- Existing routes: `/health`, `/status`, `/cdp-info`, `/navigate`, `/screenshot`, `/console`, `/network`.
- Loopback-only compose port publishing for noVNC, CDP, API/dashboard, and sample app.
- Mission artifacts and redacted evidence behavior.

## Current limitations

- The registry does not start/stop target apps.
- noVNC path gateway under `http://127.0.0.1:6080/apps/:appId/novnc` and `/sessions/:sessionId/novnc` is not implemented yet.
- Dynamic session noVNC currently uses real per-session ports returned by the backend.
- No model providers, secrets, authentication, or cloud behavior.

## Validation snapshot

- `npm run build`: passed on 2026-07-08.
- `npm run test:unit`: passed on 2026-07-08, 50 tests.
- `npm run lint`: passed on 2026-07-08.
- `docker compose build`: passed on 2026-07-08.
- `docker compose up -d`: passed on 2026-07-08.
- `curl http://127.0.0.1:8090/health`: passed, `status: ok`.
- `GET /status`: passed, startup target is `http://sample-app:3000`, profile is `ephemeral`.
- `GET /api/apps`: passed, seeded `Sample App` is present.
- `GET /api/docs/Index`: passed, reads Markdown from `docs-vault/Index.md`.
- Multi Observer A/B check: passed. Created two registered apps, opened both, verified distinct session IDs, distinct `watchUrl` values (`6083` and `6085` in the run), distinct `cdpUrl` values (`9224` and `9225`), and verified that navigating app A to `/long-content` did not change app B.
- CDP visual check: passed, dashboard Docs view rendered; screenshot at `artifacts/screenshots/dashboard-docs-verification.png`.
- Functional `make smoke` equivalent: passed by running `docker compose exec raveneye node /app/apps/mission-runner/dist/cli.js run /config/missions/generic-smoke.yaml`; run `2026-07-08T1054-generic-smoke`, 0 findings.
- `make build`, `make up`, `make health`, `make smoke`: not invoked directly because `make` is not installed in this PowerShell environment. Equivalent Docker/curl commands were executed successfully.
