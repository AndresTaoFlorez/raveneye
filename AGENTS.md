# AGENTS.md — Operating manual for AI agents

You are an AI agent. This repository gives you **eyes and hands in a real browser**:
a visible Chromium in Docker that a human is watching live at `http://127.0.0.1:6080`.
Everything you do in this browser is seen by the human in real time. Use it to observe
rendered reality, reproduce problems, capture evidence, and verify fixes.

## 0. Preconditions — always check first

```bash
curl -fsS http://127.0.0.1:8090/health
```

- HTTP 200 + `"status":"ok"` → proceed.
- HTTP 503 → observer degraded; the failing component is named in `components[]`. Try
  `docker compose exec ui-observer supervisorctl -c /etc/ui-observer/supervisord.conf restart <component>`.
- Connection refused → stack is down. Run `make up` (from this repo's root), wait ~15 s, re-check.

## 1. Your control surfaces (pick one, they all drive the SAME visible browser)

| Surface | When to use | How |
|---|---|---|
| **CDP + Playwright** | complex interaction, assertions | `chromium.connectOverCDP('http://127.0.0.1:9222')` → `browser.contexts()[0].pages()[0]` |
| **Playwright MCP** | if you have MCP tools loaded | server config uses `--cdp-endpoint http://127.0.0.1:9222` |
| **HTTP API** | quick ops without Playwright | `http://127.0.0.1:8090` — routes below |
| **CLI** | shell-only capability | `scripts/observer <cmd>` from repo root |
| **Missions** | reproducible evidence, before/after proof | `scripts/run-mission.sh <name>` |

## 2. HTTP API reference (port 8090)

```
GET  /health                    → {status: ok|degraded, components:[{component,ok,detail}]}
GET  /status                    → {target_url, allowed_hosts, viewport, pages:[urls]}
GET  /cdp-info                  → how to attach over CDP
POST /navigate  {"url":"..."}   → 200 {ok:true} | 422 {ok:false, detail:"<policy reason>"}
POST /screenshot {"name":"x","full_page":false}
                                → 200 {ok:true, path:"/artifacts/screenshots/<file>.png"}
GET  /console?clear=1           → {count, entries:[{ts,kind,level,text,page_url,location}]}
GET  /network?problems=1&clear=1→ {count, entries:[{ts,method,url,status,failure,duration_ms,
                                   request_headers,response_headers}]}
```

`?problems=1` filters to failures/4xx/5xx/aborted. Headers/params arrive already redacted
(`[REDACTED]`) — evidence is safe to quote.

## 3. Rules (hard constraints)

1. **Navigate only to authorized targets.** The URL policy allows `http/https` to hosts in
   `UI_OBSERVER_ALLOWED_HOSTS` only. A 422 response means blocked — do NOT try to bypass;
   ask the human to add the host to `.env` if it is legitimate.
2. **Never expose the ports.** 6080/9222/8090 are loopback-only by design. Do not publish,
   tunnel, or bind them elsewhere.
3. **Detach, don't kill.** `browser.close()` on your CDP client detaches; never terminate
   the Chromium process or the observer container mid-session unless asked.
4. **You do not modify target applications** through this tool. Code fixes require explicit
   human authorization and happen in the target's own repository.
5. **Treat `artifacts/` as sensitive.** Screenshots/video may show real application data.
6. The human can grab the mouse at any time — if the page state changes unexpectedly,
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

- Bundled sample app: `http://sample-app:3000` (routes with intentional defects for
  self-testing: `/console-error`, `/network-fail`, `/responsive?broken=1`).
- App on the human's machine: `http://host.docker.internal:<port>` (it must listen on
  0.0.0.0).
- Another container: `docker network connect ui-observer_default <container>` then
  `http://<container>:<port>` — and the hostname must be added to allowed hosts.

## 8. Repo conventions (if you are asked to modify THIS repository)

- TypeScript strict, npm workspaces (`apps/shared` → `apps/observer-server`,
  `apps/mission-runner`). Build: `npx tsc -b apps/shared apps/observer-server apps/mission-runner`.
- Tests: `npm run test:unit` (no stack) · `npm test` (needs `make up`). Real-Chromium
  integration tests live in `tests/integration` and `tests/e2e` — never replace them with mocks.
- Playwright version and the Docker base image tag must move together (both 1.61.1).
- Lint before committing: `npm run lint`. Human-facing docs live in `docs/` and
  `docs-vault/` (Obsidian vault — keep wikilinks resolving).
