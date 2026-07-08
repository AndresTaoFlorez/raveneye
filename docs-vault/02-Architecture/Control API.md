---
tags: [architecture, agents]
---

# Control API

HTTP interface of the [Observer Server](./Observer%20Server.md) at **`http://127.0.0.1:8090`**. Simpler than [Playwright over CDP](../04-Agents/Playwright%20over%20CDP.md) — no Playwright client needed, ideal for shell-driven agents (the [Observer CLI](../04-Agents/Observer%20CLI.md) wraps it).

## Routes

| Route | Purpose |
|---|---|
| `GET /health` | component health; 200 ok / 503 degraded — see [Health Model](./Health%20Model.md) |
| `GET /status` | version, [Profiles](../05-Operations/Profiles.md) mode, target, allowed hosts, viewport, active [Session Model](./Session%20Model.md) sessions |
| `GET /cdp-info` | how to attach via the [CDP Endpoint](./CDP%20Endpoint.md) |
| `POST /navigate` `{"url": "…"}` | navigate the shared page; **422** if the [URL Policy](../06-Security/URL%20Policy.md) rejects |
| `POST /screenshot` `{"name?", "full_page?"}` | PNG into `artifacts/screenshots/`, see [Artifacts](../03-Missions/Artifacts.md) |
| `GET /console?clear=1` | captured console + page errors (redacted) |
| `GET /network?problems=1&clear=1` | captured requests; `problems=1` filters failures/4xx/5xx |
| `GET /api/apps` | list registered [Application Registry](./Application%20Registry.md) apps |
| `POST /api/apps` | create an observed app |
| `GET /api/apps/:id` | read one observed app |
| `PATCH /api/apps/:id` | update an observed app |
| `DELETE /api/apps/:id` | delete an observed app |
| `POST /api/apps/:id/open` | start or reuse an app session; returns `session`, `watchUrl`, and `cdpUrl` |
| `GET /api/sessions` | list active observer sessions |
| `GET /api/sessions/:id` | read one active observer session |
| `DELETE /api/sessions/:id` | stop one dynamic observer session |
| `GET /api/settings` | read persisted local dashboard/settings values |
| `PATCH /api/settings` | update persisted settings, currently `max_dynamic_sessions` |
| `GET /api/runs` | list recent mission run folders |
| `GET /api/runs/:runId` | summarize one run from manifest/findings/report metadata |
| `GET /api/docs` | list `docs-vault/` Markdown notes |
| `GET /api/docs/:slug` | read one docs-vault note as Markdown |

## Examples

```bash
curl -s http://127.0.0.1:8090/health
curl -s -X POST http://127.0.0.1:8090/navigate \
     -H 'content-type: application/json' \
     -d '{"url":"http://sample-app:3000/network-fail"}'
curl -s "http://127.0.0.1:8090/network?problems=1"
curl -s http://127.0.0.1:8090/api/apps
curl -s -X POST http://127.0.0.1:8090/api/apps/sample-app/open
curl -s http://127.0.0.1:8090/api/sessions
curl -s -X PATCH http://127.0.0.1:8090/api/settings \
     -H 'content-type: application/json' \
     -d '{"max_dynamic_sessions":10}'
```

## Behavior notes

- Console/network evidence is collected **continuously** into 2000-entry ring buffers by the [Observer Server](./Observer%20Server.md) — you can ask *after* something went wrong.
- Every captured entry already passed [Secret Redaction](../06-Security/Secret%20Redaction.md); verified: an `Authorization: Bearer …` header appears as `[REDACTED]`.
- Unknown routes return the route list — the API is self-describing for agents.
- The [Local Dashboard](./Local%20Dashboard.md) is served from `/`; `/api/*` is reserved for dashboard and agent-facing JSON routes.
- Documentation routes read from the same `docs-vault/` source packaged into the observer image; RavenEye does not maintain a separate `docs/` tree.
- The backend owns all noVNC/CDP session URLs. Consumers must use `watchUrl`, `session.novncUrl`, and `cdpUrl` from the API instead of building noVNC URLs locally.

Related: [Agent Integration](../04-Agents/Agent%20Integration.md) · [Configuration](../05-Operations/Configuration.md) · [Local Dashboard](./Local%20Dashboard.md)
