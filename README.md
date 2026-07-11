# RavenEye

_See what tests can’t_.

A standalone development tool that lets a **coding agent and a human developer watch and control real local Chromium sessions** — from the historical shared base browser to isolated app workspaces.

```text
Human developer
        │ watches through noVNC (http://127.0.0.1:6080)
        ▼
Visible Chromium session(s) (in Docker)
        ▲
        │ controlled through Playwright / CDP / HTTP API / missions
Coding agent
```

The agent navigates, clicks, types, resizes, screenshots, records traces and video, and captures console, network, and accessibility evidence — so it can detect and fix the class of problems that code inspection and unit tests miss: broken layouts, hidden controls, horizontal overflow, confusing flows, console errors, failed requests.

## Install in one command

**Requiere Docker Desktop (o Docker Engine en Linux) y Node.js 22+.**

Linux / macOS:
```bash
curl -fsSL https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.sh | bash
```

Windows (PowerShell):
```powershell
irm https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.ps1 | iex
```

El script clona el repo en `~/.raveneye`, levanta el stack Docker, compila el servidor MCP y lo registra en Claude Code. Al terminar, abre una nueva conversación en Claude Code y escribe `/mcp` — verás `raveneye` con 11 tools.

---

## Prerequisites

### Linux

| Requirement | Minimum | How to install |
|-------------|---------|----------------|
| Docker Engine + Compose v2 | 24+ | `curl -fsSL https://get.docker.com \| sh` |
| Node.js | 22+ | `nvm install 22` or distro package manager |
| make | any | `apt install make` / `dnf install make` |
| git | any | distro package manager |

> **SELinux (Fedora/RHEL):** the `compose.yaml` already adds `:z` labels to all bind mounts. No extra steps.

Verify everything is ready:
```bash
bash scripts/verify-workspace.sh
```

### Windows

| Requirement | Minimum | How to install |
|-------------|---------|----------------|
| Docker Desktop (WSL2 backend) | 4.25+ | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org) LTS installer |
| git | any | [git-scm.com](https://git-scm.com) |
| make (optional) | any | `scoop install make` or use Git Bash |

> **WSL2:** Docker Desktop must use the WSL2 backend (default since v4). Each `make` command has a `docker compose` equivalent listed in the sections below.

Verify ports are free (PowerShell):
```powershell
@(6080, 9222, 8090) | ForEach-Object {
    $used = (Test-NetConnection 127.0.0.1 -Port $_ -WarningAction SilentlyContinue).TcpTestSucceeded
    if ($used) { Write-Host "BUSY  port $_" -ForegroundColor Red }
    else       { Write-Host "free  port $_" -ForegroundColor Green }
}
```

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/your-org/raveneye.git && cd raveneye

# 2. Configure (optional — defaults work out of the box)
cp .env.example .env

# 3. Build the Docker image and start the stack
make build
make up          # starts only raveneye
make health      # wait for "status":"ok"

# 4. Build Node.js packages (includes the MCP server)
npm install && npm run build
```

**Windows — no make (PowerShell):**
```powershell
cp .env.example .env
docker compose build
docker compose up -d
Start-Sleep 15
curl http://127.0.0.1:8090/health   # expect {"status":"ok"}
npm install; npm run build
```

Open `http://127.0.0.1:6080` and you will see the base Chromium session displaying RavenEye's local dashboard. Open `http://127.0.0.1:8090/overview` directly for the dashboard: Overview app registry, live session preview, sessions, mission runs, settings, and docs.

`docker compose up -d` and `make up` intentionally start only `raveneye`. The bundled sample app is available only when requested:

```bash
docker compose --profile sample up -d sample-app
scripts/run-mission.sh generic-smoke --target-url http://sample-app:3000
```

## Fast fix loop

```bash
make up
make health
scripts/observer navigate http://host.docker.internal:<port>/
scripts/observer screenshot before-fix
scripts/observer console
scripts/observer network --problems
# fix the target app in its own repo, then repeat the same screenshot/mission
```

For repeatable evidence, create a mission in `config/missions/` and run `make mission MISSION=<name>`.

## Pointing it at your application

Use the dashboard Overview at `http://127.0.0.1:8090/overview` to register apps and open isolated observed sessions. `.env` remains the startup fallback:

| Target | URL |
|---|---|
| RavenEye dashboard | `http://127.0.0.1:8090/overview` |
| App running on the host | `http://host.docker.internal:<port>` |
| App in another compose network | attach the service and use its name |
| Bundled sample app, optional | start with `docker compose --profile sample up -d sample-app`, then use `http://sample-app:3000` |

Only hosts listed in `RAVENEYE_ALLOWED_HOSTS` are reachable; `file:`, `javascript:` and `data:` URLs are always rejected.

## Commands

```bash
make build / up / down / restart / logs   # lifecycle
make open                                 # print the noVNC URL
make health                               # component-by-component observer health
make smoke                                # optional sample-oriented validation mission
make mission MISSION=<name>               # run config/missions/<name>.yaml
make artifacts                            # list recent runs
make trace RUN_ID=<run-id>                # open a recorded Playwright trace
make reset-profile                        # wipe the persistent browser profile
make cleanup                              # delete runs older than retention window
make test                                 # unit + integration tests
```

## Agent Setup (MCP)

Raveneye ships a custom MCP server (`apps/mcp-server/`) that exposes its capabilities as named tools. Any MCP-capable agent can call `raveneye_health`, `raveneye_navigate`, `raveneye_screenshot`, `raveneye_observe`, `raveneye_click`, `raveneye_fill`, and more — without knowing ports or protocols.

**The Docker stack must be running (`make up`) before an agent calls any tool.**

### Available tools

| Tool | What it does |
|------|-------------|
| `raveneye_health` | Check stack health |
| `raveneye_status` | Active sessions, target URL, viewport |
| `raveneye_navigate` | Navigate the browser to a URL |
| `raveneye_screenshot` | Take a screenshot → returns inline PNG |
| `raveneye_observe` | **Best first call** — screenshot + console + network in one |
| `raveneye_console` | Read the console log buffer |
| `raveneye_network` | Read network events (optional: failures only) |
| `raveneye_click` | Click a DOM element by CSS selector |
| `raveneye_fill` | Type into a text input |
| `raveneye_apps_list` | List registered apps |
| `raveneye_app_open` | Open an isolated session for a registered app |

---

### Claude Code

Register the server once per machine (run from the repo root):

**Linux:**
```bash
claude mcp add raveneye -- node "$(pwd)/apps/mcp-server/dist/index.js"
```

**Windows (PowerShell):**
```powershell
claude mcp add raveneye -- node "$PWD\apps\mcp-server\dist\index.js"
```

Confirm with `/mcp` in Claude Code — `raveneye` should appear with 11 tools.

**Project-level config** (committed, shared with the team) — create `.claude/settings.json` in the repo root:
```json
{
  "mcpServers": {
    "raveneye": {
      "type": "stdio",
      "command": "node",
      "args": ["apps/mcp-server/dist/index.js"]
    }
  }
}
```

---

### Codex (OpenAI)

Add a `codex.json` to the repo root (project-level, relative path):
```json
{
  "mcpServers": {
    "raveneye": {
      "command": "node",
      "args": ["apps/mcp-server/dist/index.js"]
    }
  }
}
```

Or add to the global `~/.codex/config.json` with an absolute path.

**Linux:**
```json
{
  "mcpServers": {
    "raveneye": {
      "command": "node",
      "args": ["/home/you/projects/raveneye/apps/mcp-server/dist/index.js"]
    }
  }
}
```

**Windows (PowerShell — create the file):**
```powershell
$cfg = @{ mcpServers = @{ raveneye = @{
  command = "node"
  args    = @("$PWD\apps\mcp-server\dist\index.js")
}}} | ConvertTo-Json -Depth 5
New-Item -Force "$HOME\.codex" -ItemType Directory | Out-Null
$cfg | Set-Content "$HOME\.codex\config.json" -Encoding UTF8
```

Start Codex from the repo directory. The `raveneye_*` tools appear automatically.

---

### OpenCode

Add an `opencode.json` to the repo root:
```json
{
  "mcp": {
    "raveneye": {
      "type": "local",
      "command": ["node", "apps/mcp-server/dist/index.js"]
    }
  }
}
```

Or edit the global config at `~/.config/opencode/opencode.json` (Linux) / `%APPDATA%\opencode\opencode.json` (Windows) with an absolute path:

**Linux:**
```json
{
  "mcp": {
    "raveneye": {
      "type": "local",
      "command": ["node", "/home/you/projects/raveneye/apps/mcp-server/dist/index.js"]
    }
  }
}
```

**Windows:**
```json
{
  "mcp": {
    "raveneye": {
      "type": "local",
      "command": ["node", "C:\\Users\\you\\projects\\raveneye\\apps\\mcp-server\\dist\\index.js"]
    }
  }
}
```

---

### Environment overrides for the MCP server

If your ports differ from defaults, set these environment variables when registering the server:

| Variable | Default | Purpose |
|----------|---------|---------|
| `RAVENEYE_API` | `http://127.0.0.1:8090` | HTTP API base URL |
| `RAVENEYE_CDP` | `http://127.0.0.1:9222` | CDP endpoint |
| `RAVENEYE_ARTIFACTS` | `./artifacts` | Host-side artifacts path |

---

## Troubleshooting

**Stack won't start:**
```bash
make logs    # or: docker compose logs -f raveneye
```
Common causes: port conflict (change ports in `.env`), Docker not running, insufficient RAM (Chromium needs ~2 GB).

**Health returns 503:** an internal component failed. Check which one and restart it:
```bash
docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf status
docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf restart <component>
```

**MCP tools not appearing:**
1. `curl http://127.0.0.1:8090/health` — stack must be up
2. `ls apps/mcp-server/dist/index.js` — build must exist; run `npm run build` if missing
3. Restart / reload the agent

**`raveneye_navigate` returns 422:** the target hostname is not in the allowed list. Add it to `RAVENEYE_ALLOWED_HOSTS` in `.env`, or register the app through the dashboard at `http://127.0.0.1:8090/` (no `.env` editing required).

**Windows: `make` not found:** install via Scoop (`scoop install make`) or use the `docker compose` equivalents shown above.

---

## Documentation

**[docs-vault/](docs-vault/Index.md)** is the single source of truth — a full user guide as an
Obsidian-ready Markdown vault using standard `[label](path.md)` links. Key entry points:

- [Quick Start](docs-vault/05-Operations/Quick%20Start.md) · [Observing Your Own App](docs-vault/05-Operations/Observing%20Your%20Own%20App.md)
- [Architecture Overview](docs-vault/02-Architecture/Architecture%20Overview.md) · [Mission Format](docs-vault/03-Missions/Mission%20Format.md)
- [Agent Integration](docs-vault/04-Agents/Agent%20Integration.md) — and **[AGENTS.md](AGENTS.md)** for the agents themselves
- [Security Model](docs-vault/06-Security/Security%20Model.md) · [Fedora Notes](docs-vault/05-Operations/Fedora%20Notes.md) · [Troubleshooting](docs-vault/05-Operations/Troubleshooting.md)

## Repository layout

```text
apps/observer-server/   container: Xvfb + Chromium + noVNC + control API
apps/mission-runner/    declarative mission executor producing evidence
apps/shared/            URL policy, redaction, shared types
apps/sample-app/        generic zero-dependency app used to validate the observer
config/missions/        mission YAML files
artifacts/runs/<id>/    evidence: report, findings, trace, video, screenshots
.status/                phase-by-phase implementation status reports
```

## Status

See [.status/current.md](.status/current.md) for implementation progress and demonstrated capabilities.
