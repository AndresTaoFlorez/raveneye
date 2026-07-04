# Agent integration

ui-observer is agent-neutral. Any coding agent that can run a CLI command, speak HTTP,
or drive Playwright can observe and control the shared browser. The human always watches
the same session at `http://127.0.0.1:6080`.

## Integration surfaces

| Surface | Endpoint | Best for |
|---|---|---|
| CDP | `http://127.0.0.1:9222` | full Playwright control of the *shared* browser |
| Playwright MCP | attaches via `--cdp-endpoint` | agents with MCP support (Claude Code, Codex, …) |
| HTTP control API | `http://127.0.0.1:8090` | navigation, screenshots, console/network reads without Playwright |
| CLI | `scripts/observer …` | shell-driven agents and humans |
| Mission runner | `scripts/run-mission.sh <name>` | reproducible journeys with full evidence |

All navigation — regardless of surface — passes the URL policy
(`http`/`https` only, hosts limited to `UI_OBSERVER_ALLOWED_HOSTS`).

### 1. CDP with your own Playwright

```js
import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages()[0]; // the page the human is watching
await page.goto('http://sample-app:3000/form');
await page.getByLabel('Full name').fill('Ada');
await page.screenshot({ path: 'evidence.png' });
await browser.close(); // detaches; the shared browser keeps running
```

Anything the agent does here is instantly visible in noVNC — and anything a human does
through noVNC (e.g. logging in) is visible to the agent. That is the shared-session model.

### 2. Playwright MCP attached to the shared browser

Claude Code:

```bash
claude mcp add ui-observer -- npx @playwright/mcp@latest --cdp-endpoint http://127.0.0.1:9222
```

Codex (`~/.codex/config.toml`) — one example; any MCP client works the same way:

```toml
[mcp_servers.ui-observer]
command = "npx"
args = ["@playwright/mcp@latest", "--cdp-endpoint", "http://127.0.0.1:9222"]
```

The MCP server's snapshot/click/type tools now operate on the human-visible browser.

### 3. HTTP control API

```bash
curl -s http://127.0.0.1:8090/health                      # observer component health
curl -s http://127.0.0.1:8090/status                      # current pages, config
curl -s -X POST http://127.0.0.1:8090/navigate \
     -H 'content-type: application/json' -d '{"url":"http://sample-app:3000/"}'
curl -s -X POST http://127.0.0.1:8090/screenshot \
     -H 'content-type: application/json' -d '{"name":"before-fix"}'
curl -s http://127.0.0.1:8090/console                     # captured console + page errors
curl -s "http://127.0.0.1:8090/network?problems=1"        # failed/4xx/5xx/aborted requests
```

### 4. CLI

`scripts/observer navigate|screenshot|console|network|health|status|cdp-info` — same
operations, shell-friendly output.

## The observation workflow

1. **Start the observer** — `make up` (or verify with `scripts/observer health`).
2. **Open the target** — `scripts/observer navigate <url>`, or point `UI_OBSERVER_TARGET_URL`
   at the app (host apps: `http://host.docker.internal:<port>`).
3. **Inspect the current page** — CDP/MCP snapshot, `POST /screenshot`, `GET /console`,
   `GET /network?problems=1`.
4. **Perform actions** — CDP/MCP clicks and typing (visible to the human), or mission steps.
5. **Capture evidence** — run a mission: `scripts/run-mission.sh generic-smoke`; every run
   writes `artifacts/runs/<run-id>/` with report, findings, trace, video, screenshots.
6. **Read findings** — `artifacts/runs/<run-id>/findings.json` (machine) and `report.md` (human).
7. **Repeat after code changes** — run the *same* mission again and diff `findings.json`
   between the two run directories. Exit code 0 = clean; 1 = critical/high findings remain.

## The reasoning loop (observe → fix → verify)

```
run mission  →  findings + evidence  →  inspect target code  →  smallest safe fix
     ↑                                                                  │
     └──────────── re-run the same mission and compare ←────────────────┘
```

The observer never modifies target applications. The agent changes code only when
explicitly authorized and with access to the target repository. A demonstrated example
of this loop lives in `.status/phase-4-agent-integration.md`.

## Notes and limitations

- The mission runner uses its own clean context (same X display, so still human-visible)
  rather than the shared CDP session: Playwright's native trace/video recording is only
  fully supported on contexts it creates itself.
- CDP is unauthenticated; it is published on loopback only. Do not re-publish it.
- `browser.close()` after `connectOverCDP` only detaches the client; supervisord keeps
  the shared browser alive. If the browser truly dies, the observer exits and is relaunched
  with a fresh session automatically.
