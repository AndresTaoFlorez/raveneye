# AGENTS.md — Operating manual for AI agents

You are an AI agent. This repository gives you **eyes and hands in real browsers**:
a base visible Chromium in Docker that a human is watching live at `http://127.0.0.1:6080`,
plus optional isolated app sessions with backend-owned noVNC/CDP URLs. Everything you do
in a watched session is seen by the human in real time. Use it to observe rendered reality,
reproduce problems, capture evidence, and verify fixes.

## 0. Preconditions — always check first

```bash
curl -fsS http://127.0.0.1:8090/health
```

- HTTP 200 + `"status":"ok"` → proceed.
- HTTP 503 → observer degraded; the failing component is named in `components[]`. Try
  `docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf restart <component>`.
- Connection refused → stack is down. Run `make up` (from this repo's root), wait ~15 s, re-check.

## 1. Your control surfaces

| Surface | When to use | How |
|---|---|---|
| **Raveneye MCP** | recommended — named tools for any MCP-capable agent | see §1a below for registration; tools: `raveneye_health`, `raveneye_navigate`, `raveneye_screenshot`, `raveneye_observe`, `raveneye_console`, `raveneye_network`, `raveneye_click`, `raveneye_fill`, `raveneye_apps_list`, `raveneye_app_open` |
| **Base CDP + Playwright** | direct browser interaction, assertions | `chromium.connectOverCDP('http://127.0.0.1:9222')` → `browser.contexts()[0].pages()[0]` |
| **Dynamic session CDP** | app-specific isolated sessions | read `cdpUrl` from `POST /api/apps/:id/open`, `GET /api/sessions`, or `GET /cdp-info` |
| **Playwright MCP** | if you have MCP tools loaded | server config uses the relevant `--cdp-endpoint` |
| **HTTP API** | quick ops without Playwright | `http://127.0.0.1:8090` — routes below |
| **CLI** | shell-only capability | `scripts/observer <cmd>` from repo root |
| **Missions** | reproducible evidence, before/after proof | `scripts/run-mission.sh <name>` |

### §1a — Raveneye MCP server

The custom MCP server lives in `apps/mcp-server/`. It wraps the HTTP API (port 8090) and CDP (port 9222) as named MCP tools, so any MCP-capable agent (Claude Code, Codex, etc.) can call Raveneye operations without knowing its internals.

**Option A — global (recommended):**
```bash
npm install -g raveneye-mcp-server
npx raveneye-mcp-server setup claude   # Claude Code
npx raveneye-mcp-server setup codex    # Codex / OpenCode (~/.codex/config.toml)
```

**Option B — dev dependency in your project (`-D`):**
```bash
npm install -D raveneye-mcp-server
```
Add to `.claude/settings.json` / `codex.json` / `opencode.json`:
```json
{
  "mcpServers": {
    "raveneye": {
      "command": "npx",
      "args": ["--yes", "raveneye-mcp-server"]
    }
  }
}
```

**Option C — build from source (contributors only):**
```bash
npm install --workspace=apps/mcp-server && npm run build --workspace=apps/mcp-server
claude mcp add raveneye -- node /path/to/raveneye/apps/mcp-server/dist/index.js
```

**Environment overrides** (all optional):
- `RAVENEYE_API` — HTTP API base URL (default `http://127.0.0.1:8090`)
- `RAVENEYE_CDP` — CDP endpoint (default `http://127.0.0.1:9222`)
- `RAVENEYE_ARTIFACTS` — host-side artifacts directory (default `~/.raveneye/artifacts`)

## 2. HTTP API reference (port 8090)

```
GET  /health                    → {status: ok|degraded, components:[{component,ok,detail}]}
GET  /status                    → {target_url, allowed_hosts, viewport, sessions:[...]}
GET  /cdp-info                  → how to attach over CDP
POST /navigate  {"url":"..."}   → 200 {ok:true} | 422 {ok:false, detail:"<policy reason>"}
POST /screenshot {"name":"x","full_page":false}
                                → 200 {ok:true, path:"/artifacts/screenshots/<file>.png"}
GET  /console?clear=1           → {count, entries:[{ts,kind,level,text,page_url,location}]}
GET  /network?problems=1&clear=1→ {count, entries:[{ts,method,url,status,failure,duration_ms,
                                   request_headers,response_headers}]}
GET  /api/apps                  → {apps:[registered observed apps]}
POST /api/apps                  → create observed app
PATCH/DELETE /api/apps/:id      → update/delete observed app
POST /api/apps/:id/open         → {app, session, watchUrl, cdpUrl}
GET  /api/sessions              → active sessions
GET  /api/sessions/:id          → one active session or 404
DELETE /api/sessions/:id        → stop one dynamic session
GET  /api/runs                  → recent mission run summaries
GET  /api/docs                  → docs-vault Markdown note index
GET  /api/docs/:slug            → one docs-vault Markdown note
```

`?problems=1` filters to failures/4xx/5xx/aborted. Headers/params arrive already redacted
(`[REDACTED]`) — evidence is safe to quote.

## 3. Rules (hard constraints)

1. **Navigate only to authorized targets.** Direct `/navigate` uses registered/global effective hosts.
   Registered app opens use global + app allowed hosts. A 422 response
   means blocked — do NOT try to bypass; ask the human to add the host to `.env` or the app registry
   if it is legitimate.
2. **Never expose the ports.** 6080/9222/8090 and dynamic session ports are loopback-only by design. Do not publish,
   tunnel, or bind them elsewhere.
3. **Use backend-owned watch URLs.** Do not fabricate `6080/?app=id` or similar noVNC URLs. noVNC/websockify do not use that query string to select a session.
4. **Detach, don't kill.** `browser.close()` on your CDP client detaches; never terminate
   the Chromium process or the observer container mid-session unless asked.
5. **You do not modify target applications** through this tool. Code fixes require explicit
   human authorization and happen in the target's own repository.
6. **Treat `artifacts/` as sensitive.** Screenshots/video may show real application data.
7. The human can grab the mouse at any time — if the page state changes unexpectedly,
   re-read state (`GET /status`, snapshot) instead of assuming your last action failed.

## 4. Standard workflow: find and fix a UI problem

```
1. curl :8090/health                        # eyes working?
2. POST /navigate {"url": target}           # or scripts/observer navigate <url>
3. POST /screenshot                         # look at the page (read the PNG)
4. GET /console  +  GET /network?problems=1 # anything already broken?
5. Interact over CDP/MCP (click, type, resize) — the human is watching
6. scripts/run-mission.sh <mission>         # reproducible evidence run
7. Read artifacts/runs/<run-id>/findings.json and report.md
8. (authorized fix in the target repo, rebuild target)
9. Re-run the SAME mission; compare findings.json and exit codes
```

Mission exit codes: `0` pass · `1` critical/high findings or failed step · `2` invalid
mission/target rejected · `3` browser failure. Use them as gates.

## 5. Reading a run

`artifacts/runs/<run-id>/` contains: `report.md` (summary), `findings.json` (structured
problems: category, severity, route, reproduction_steps, expected vs actual,
suspected_component, confidence), `actions.json`, `console.json`, `page-errors.json`,
`network.json`, `accessibility.json`, `inspections.json`, `trace.zip`, `video/`,
`screenshots/`. Start with `findings.json`; `suspected_component` tells you where to look
in the target's code.

## 6. Writing a mission for a new target

Copy `config/missions/generic-smoke.yaml`, set `target_url`, keep steps to the journey you
want checked. Schema is strict — validate before running:

```bash
node apps/mission-runner/dist/cli.js validate config/missions/<name>.yaml
```

Actions available: goto navigate reload back forward click fill type press select check
uncheck hover scroll wait wait_for_ready wait_for_selector screenshot
inspect_accessibility capture_console capture_network check_horizontal_overflow
set_viewport. Locators: `role`+`name` (preferred) | `label` | `text` | `selector`.
Checks: no_unhandled_page_errors, no_critical_console_errors,
no_unexpected_failed_requests, no_horizontal_overflow, interactive_controls_visible,
keyboard_navigation_available — each accepts `allow: [substrings]` for expected noise.

## 7. Reaching targets

- Optional bundled sample app: run `docker compose --profile sample up -d sample-app`,
  then use `http://sample-app:3000` (routes with intentional defects for self-testing:
  `/console-error`, `/network-fail`, `/responsive?broken=1`).
- App on the human's machine: `http://host.docker.internal:<port>` (it must listen on
  0.0.0.0).
- Another container: `docker network connect raveneye_default <container>` then
  `http://<container>:<port>` — and the hostname must be added to allowed hosts.
- Local dashboard, app registry, sessions, and docs-vault browser: open `http://127.0.0.1:8090/`
  to register, edit, delete, open, watch, or stop observed apps without changing `.env`.

## 8. Repo conventions (if you are asked to modify THIS repository)

- TypeScript strict, npm workspaces (`apps/shared` → `apps/observer-server`,
  `apps/mission-runner`, `apps/dashboard`). Build: `npm run build`.
- Tests: `npm run test:unit` (no stack) · `npm test` (needs `make up`). Real-Chromium
  integration tests live in `tests/integration` and `tests/e2e` — never replace them with mocks.
- Playwright version and the Docker base image tag must move together (both 1.61.1).
- Lint before committing: `npm run lint`. Human-facing docs live in `docs-vault/` (Obsidian
  vault — the single source of truth; keep wikilinks resolving). Do not create a separate
  `docs/` directory.
