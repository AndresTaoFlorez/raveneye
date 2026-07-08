---
tags: [architecture, dashboard]
---

# Local Dashboard

RavenEye v0.2 serves a local dashboard from the [Observer Server](./Observer%20Server.md) at `http://127.0.0.1:8090/`.

The dashboard is a static React app built from `apps/dashboard/` and copied into the observer image. It is intentionally local-only: the same compose port binding keeps the dashboard on `127.0.0.1`, alongside the [Control API](./Control%20API.md).

## Frontend architecture

`apps/dashboard/src/` follows Onion Architecture:

- `domain/` contains entities and domain errors only.
- `application/` contains ports and use cases.
- `infrastructure/` implements those ports against the Control API.
- `presentation/` contains React, Redux Toolkit, CSS Modules, and GSAP UI animation.

Dependencies point inward. Domain does not import React, Redux, HTTP, CSS, GSAP, or infrastructure details.

## Views

- `/overview`: health, status, target URL, allowed hosts, active sessions, app registry actions, live selected-session preview, and backend-owned noVNC links.
- `/sessions`: real backend sessions only. The dashboard does not infer sessions from URLs or pages.
- `/mission-runs`: recent `artifacts/runs` folders with manifest status, findings count, and report path when available.
- `/settings`: editable dynamic-session limit, basic diagnostics, health components, status data, and links to JSON control surfaces.
- `/docs` and `/docs/:slug`: browse the live `docs-vault/` Markdown files from the dashboard. The renderer supports frontmatter, headings, paragraphs, lists, tables, blockquotes, fenced code, and Markdown links. The Control API reads the vault directly through `/api/docs` and `/api/docs/:slug`, so the in-product documentation stays tied to the same source of truth used by Obsidian.

Direct reload works for every dashboard route because the observer server serves the SPA shell for `/overview`, `/sessions`, `/mission-runs`, `/settings`, `/docs`, and `/docs/:slug`.

## URL ownership

The backend owns session URLs. `POST /api/apps/:id/open` returns:

```json
{
  "app": {},
  "session": {},
  "watchUrl": "http://127.0.0.1:6081/vnc.html?autoconnect=true&resize=scale",
  "cdpUrl": "http://127.0.0.1:9223"
}
```

The dashboard must use `watchUrl` and `session.novncUrl` exactly as returned. It must not fabricate URLs such as `http://127.0.0.1:6080/?app=id`; noVNC/websockify do not use that query string to choose a backend session.

## Clean startup behavior

The default compose experience is intentionally project-agnostic:

- `RAVENEYE_TARGET_URL` defaults to `http://sample-app:3000`.
- `RAVENEYE_ALLOWED_HOSTS` defaults to the local validation hosts only.
- The registry seeds a stable `Sample App` entry with id `sample-app`.
- External targets such as Outlook, staging systems, or client apps should be registered from Overview instead of committed into the repo default `.env`.

Related: [Application Registry](./Application%20Registry.md) · [Control API](./Control%20API.md)
