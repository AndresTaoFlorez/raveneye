# Phase 2 — Programmatic control: COMPLETE

Date: 2026-07-03

## Delivered

- `apps/shared/src/redaction.ts` — header/URL/text/object secret redaction (unit-tested).
- `apps/observer-server/src/evidence.ts` — ring buffers for console, page errors and network
  activity of the shared context; every entry passes through redaction before storage.
- Control API grew: `POST /screenshot`, `GET /console`, `GET /network[?problems=1]`,
  `GET /cdp-info` (plus existing `/health`, `/status`, `POST /navigate`).
- `scripts/observer` — dependency-free CLI over the API
  (`health|status|cdp-info|navigate|screenshot|console|network`).
- Unit tests: 15 passing (URL policy + redaction).

## Verification record (2026-07-03, all against the running containers)

| Check | Evidence |
|---|---|
| CLI navigation | `observer navigate http://sample-app:3000/network-fail` → ok |
| Console capture | 4 entries captured incl. 404/500/403 resource errors |
| Network capture | 404, 500, 403 and `net::ERR_ABORTED` all recorded with timing |
| Secret redaction | `/api/secure-data` request recorded with `authorization: [REDACTED]` (page sent `Bearer sample-secret-token-12345`) |
| URL policy | `file:///etc/passwd` → 422 scheme rejected; `https://example.com` → 422 host not allowed |
| Host app via gateway | python http.server on host :8123 → navigated via `host.docker.internal:8123`, screenshot `artifacts/screenshots/2026-07-04T02-12-22-409Z-host-app-via-gateway.png` |
| Shared control | host-side Playwright `connectOverCDP` clicked "Open dialog"; X framebuffer capture `artifacts/phase2-shared-control-modal.png` shows the modal open in the visible browser |

## Notes

- The same Chromium session is controllable simultaneously through noVNC (human),
  CDP (any Playwright client on the host) and the HTTP API — demonstrated, not assumed.
- Console/network buffers are capped at 2000 entries each (ring buffer).
