---
tags: [operations, agents]
---

# Observing Your Own App

The end-to-end recipe for the real use case: **your web application lives in another folder** (its frontend possibly in its own Docker container) and you want an agent — Claude, Codex, minimax, GLM, anything — to navigate it realistically while you watch, "like a Zoom call" ([[Shared Browser Model]]), to find layout bugs, console errors, broken flows.

## Step 1 — Make the app reachable from the observer

### Option A — host-published port (recommended, simplest)

Your app's own compose (or `docker run -p`) already publishes a port on the host, e.g. `8080:80`. Then in the **ui-observer** `.env` ([[Configuration]]):

```dotenv
UI_OBSERVER_TARGET_URL=http://host.docker.internal:8080
UI_OBSERVER_ALLOWED_HOSTS=sample-app,host.docker.internal,localhost,127.0.0.1
```

```bash
cd ~/Projects/ui-observer && docker compose up -d
```

Requirement: the app must listen on `0.0.0.0` inside its container (port publishing already guarantees this). If the app runs *directly* on the host (e.g. `vite dev`), bind it to `0.0.0.0`, not only `127.0.0.1` — see [[Fedora Notes]].

### Option B — shared Docker network (no published port)

Attach your front container to the observer's network and reach it by name:

```bash
docker network connect ui-observer_default mi-front
```

Then use `UI_OBSERVER_TARGET_URL=http://mi-front:80` and **add `mi-front` to `UI_OBSERVER_ALLOWED_HOSTS`** — otherwise the [[URL Policy]] answers 422.

Caveats: give the container a stable `container_name:` in your app's compose, and redo the `network connect` if that container is recreated.

## Step 2 — Watch it

Open **http://127.0.0.1:6080**. You now see your app inside the shared Chromium. You can point at things with your mouse while the agent works — that is the Zoom-call experience.

To switch the running browser without restarting:

```bash
scripts/observer navigate http://host.docker.internal:8080/
```

## Step 3 — Hook up your agent (pick by capability)

| Agent kind | Surface | How |
|---|---|---|
| MCP-capable (Claude Code, Codex, …) | [[Playwright MCP]] | `--cdp-endpoint http://127.0.0.1:9222`; snapshot/click/type on the shared session |
| Can run a Node script (any model) | [[Playwright over CDP]] | `connectOverCDP('http://127.0.0.1:9222')` — full Playwright power |
| Shell-only agents (minimax/GLM-style CLIs) | [[Observer CLI]] / [[Control API]] | `scripts/observer navigate/screenshot/console/network` — plain commands + JSON |
| Any of them, for systematic bug-hunting | [[Mission Runner]] | write a mission (below), read `report.md` + `findings.json` |

## Step 4 — A mission for "problemillas"

`config/missions/my-app-review.yaml`:

```yaml
name: my-app-review
description: Visual and console review of my app
target_url: http://host.docker.internal:8080

steps:
  - action: goto
    path: /
  - action: wait_for_ready
  - action: screenshot
    name: home
  - action: inspect_accessibility
  - action: check_horizontal_overflow
  - action: set_viewport
    width: 390
    height: 844
  - action: screenshot
    name: home-phone
  - action: check_horizontal_overflow
  - action: capture_console
  - action: capture_network

checks:
  - no_unhandled_page_errors
  - name: no_critical_console_errors
    allow: ["favicon.ico"]
  - no_unexpected_failed_requests
  - no_horizontal_overflow
  - interactive_controls_visible
  - keyboard_navigation_available
```

```bash
make mission MISSION=my-app-review
```

Exit 1 means critical/high [[Findings]]; the full evidence (screenshots, trace, video, console/network) is in [[Artifacts]]. Rerun the same mission after each fix — that is the [[Reasoning Loop]].

## If something fails

- **422 on navigate** → host missing from the allow-list ([[URL Policy]]).
- **Timeout to a host app** → listener bound to 127.0.0.1 only, or firewall — [[Fedora Notes]].
- Anything else → [[Troubleshooting]].
