---
tags: [operations, agents, beginner]
---

# Observing Your Own App

The complete recipe for the main use case: **you have a web project in some other folder** and you want an AI agent — Claude, Codex, minimax, GLM, any of them — to open it in a real browser and hunt for problems **while you watch live**, like a screen-share call ([[Shared Browser Model]]).

New to Docker or ports? Read [[Absolute Basics]] first (5 minutes) — this note assumes those concepts.

The whole thing is 4 steps: **reach → watch → connect an agent → hunt bugs**.

---

## Step 0 — Which scenario are you in?

Run your app the way you always do, then answer one question: *how does it run?*

| How your app runs | You are in | Example |
|---|---|---|
| Directly on your machine (`npm run dev`, `python manage.py runserver`, …) | **Scenario 1** | Vite dev server on `http://localhost:5173` |
| In Docker, and `docker ps` shows a `PORTS` arrow like `0.0.0.0:8080->80/tcp` | **Scenario 2** | a compose file with `ports: ["8080:80"]` |
| In Docker, and `docker ps` shows **no arrow** for it | **Scenario 3** | an internal-only frontend container |

Not sure? Run `docker ps` and look at the PORTS column ([[Absolute Basics]] shows how to read it).

---

## Step 1 — Make the app reachable by the observer

### Scenario 1 — app running directly on your machine

Say your project is at `~/Projects/mi-tienda` and starts with `npm run dev` on port 5173.

**1.** Start it listening on all interfaces, not just localhost (the observer lives in a container and must "call back" to your machine — see `host.docker.internal` in [[Absolute Basics]]):

```bash
cd ~/Projects/mi-tienda
npm run dev -- --host 0.0.0.0        # vite
# next dev -H 0.0.0.0                # next.js
# python manage.py runserver 0.0.0.0:8000   # django
```

**2.** Tell the observer where it is — edit `~/Projects/raveneye/.env`:

```dotenv
RAVENEYE_TARGET_URL=http://host.docker.internal:5173
RAVENEYE_ALLOWED_HOSTS=sample-app,host.docker.internal,localhost,127.0.0.1
```

**3.** Apply:

```bash
cd ~/Projects/raveneye
docker compose up -d
```

✅ **Check it worked**: from the observer's point of view —

```bash
scripts/observer status
# "pages" should show http://host.docker.internal:5173/
```

If it shows an error page instead, jump to *If something fails* below.

### Scenario 2 — app in Docker with a published port

Say `docker ps` shows your frontend as `127.0.0.1:8080->80/tcp`. Then your app is already knocking-distance from the observer via door 8080 of your machine:

```dotenv
# ~/Projects/raveneye/.env
RAVENEYE_TARGET_URL=http://host.docker.internal:8080
RAVENEYE_ALLOWED_HOSTS=sample-app,host.docker.internal,localhost,127.0.0.1
```

```bash
cd ~/Projects/raveneye && docker compose up -d
```

✅ **Check**: `scripts/observer screenshot mi-app` → open the PNG it names under `artifacts/screenshots/` — you should see your app.

### Scenario 3 — app in Docker, no published port

Your front container (say it's named `mi-front` and serves on its internal port 80) publishes nothing. Plug it into the observer's private network so they can talk directly:

```bash
docker network connect raveneye_default mi-front
```

Now the observer can reach it **by container name**. Two things must use that name:

```dotenv
# ~/Projects/raveneye/.env
RAVENEYE_TARGET_URL=http://mi-front:80
RAVENEYE_ALLOWED_HOSTS=sample-app,host.docker.internal,localhost,127.0.0.1,mi-front
```

⚠️ Without `mi-front` in the allowed list, navigation is refused with a 422 — that's the [[URL Policy]] doing its job.

```bash
cd ~/Projects/raveneye && docker compose up -d
```

Caveats: give the container a fixed name in your app's compose (`container_name: mi-front`), and re-run the `network connect` if you recreate that container.

✅ **Check**: `scripts/observer navigate http://mi-front:80/` should answer `"ok": true`.

---

## Step 2 — Watch it (your side of the Zoom call)

Open **http://127.0.0.1:6080** in your normal browser. You'll see a real Chromium showing your app. You can move your own mouse in it, scroll, even log in by hand ([[Profiles]] explains keeping that login). When an agent acts, you see every click happen live.

Change page anytime without touching `.env`:

```bash
scripts/observer navigate http://host.docker.internal:8080/checkout
```

---

## Step 3 — Connect the agent (their side of the call)

Pick by what your agent can do — full matrix in [[Agent Integration]]:

| Your agent | Use | One-liner |
|---|---|---|
| **Claude Code** | [[Playwright MCP]] | `claude mcp add raveneye -- npx @playwright/mcp@latest --cdp-endpoint http://127.0.0.1:9222` |
| **Codex** | [[Playwright MCP]] | add the `[mcp_servers.raveneye]` block shown in that note |
| **minimax / GLM / any CLI agent** | [[Observer CLI]] | tell it to run `scripts/observer navigate/screenshot/console/network` |
| **Anything that can run Node** | [[Playwright over CDP]] | `chromium.connectOverCDP('http://127.0.0.1:9222')` |

There are also **instructions written directly for the agents themselves** — `AGENTS.md` at the repo root; see [[Instructions for AI Agents]]. Point your agent at that file and it knows the whole protocol.

---

## Step 4 — Hunt for "problemillas" systematically

One-off poking is Step 3. For a repeatable review that leaves evidence, give the agent (or yourself) a mission. Create `config/missions/mi-app-review.yaml`:

```yaml
name: mi-app-review
description: Visual and console review of my app
target_url: http://host.docker.internal:8080   # ← your Step-1 URL

steps:
  - action: goto
    path: /
  - action: wait_for_ready
  - action: screenshot
    name: home
  - action: inspect_accessibility
  - action: check_horizontal_overflow
  - action: set_viewport        # same page, phone-sized
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
make mission MISSION=mi-app-review
```

You watch the whole run live in noVNC. At the end:

- terminal prints `PASSED` or `FAILED` and the report path;
- `artifacts/runs/<run-id>/report.md` — readable summary;
- `findings.json` — each problem with severity, the exact element/request, and reproduction steps ([[Findings]]);
- screenshots, `trace.zip` and a **video** of the run ([[Artifacts]]).

Fix something, run the same mission again, compare — that's the [[Reasoning Loop]].

---

## If something fails

| Symptom | Cause & fix |
|---|---|
| `422` on navigate | host not in `RAVENEYE_ALLOWED_HOSTS` → add it ([[URL Policy]]) |
| Timeout / `ERR_CONNECTION_REFUSED` to a host app | app listening only on `127.0.0.1` → bind `0.0.0.0` (Scenario 1 step 1), or firewall ([[Fedora Notes]]) |
| `mi-front` unreachable in Scenario 3 | container recreated → re-run `docker network connect`; name changed → fix `container_name` |
| Anything else | [[Troubleshooting]] |
