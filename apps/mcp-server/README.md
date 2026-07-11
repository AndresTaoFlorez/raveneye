# raveneye-mcp-server

MCP server for [Raveneye](https://github.com/AndresTaoFlorez/raveneye) — give your coding agent eyes and hands in a real browser.

## What it does

Exposes 11 MCP tools so any agent (Claude Code, Codex, OpenCode) can observe, navigate, click, fill forms, take screenshots, and read console/network logs from a shared visible Chromium instance.

## Prerequisites

- Docker (to run the Raveneye stack)
- Node.js 22+

> **First install?** The package prints setup instructions automatically after `npm install`.
> If the stack is not running when a tool is called, the error message tells you exactly how to start it.

## Install

```bash
# 1. Start the Raveneye stack
docker run -d \
  -p 6080:6080 -p 8090:8090 -p 9222:9222 \
  -v raveneye-profile:/browser-profile \
  andrestao577/raveneye:latest

# 2. Install the MCP server (global or as a dev dependency)
npm install -g raveneye-mcp-server
# or: npm install -D raveneye-mcp-server
```

Registration with Claude Code and Codex (`~/.codex/config.json`) happens **automatically** during `npm install` — no extra commands needed.

Or one-command install (Linux/macOS):

```bash
curl -fsSL https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.sh | bash
```

Windows:

```powershell
irm https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.ps1 | iex
```

## Uninstall

```bash
# Remove the package
npm uninstall -g raveneye-mcp-server
# or (dev dependency): npm uninstall raveneye-mcp-server

# Remove the MCP registration from Claude Code
claude mcp remove raveneye
```

For Codex, remove the `raveneye` entry from `~/.codex/config.json`.

## Available tools

| Tool | Description |
|------|-------------|
| `raveneye_health` | Check if the stack is running |
| `raveneye_status` | Current browser session status |
| `raveneye_navigate` | Navigate to a URL |
| `raveneye_screenshot` | Take a screenshot (returns inline image) |
| `raveneye_observe` | Screenshot + console + network in one call |
| `raveneye_console` | Read browser console logs |
| `raveneye_network` | Read network requests |
| `raveneye_click` | Click a DOM element by selector |
| `raveneye_fill` | Fill an input field |
| `raveneye_apps_list` | List registered apps |
| `raveneye_app_open` | Open a registered app |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RAVENEYE_API` | `http://127.0.0.1:8090` | Observer HTTP API |
| `RAVENEYE_CDP` | `http://127.0.0.1:9222` | Chrome DevTools Protocol |
| `RAVENEYE_ARTIFACTS` | `~/.raveneye/artifacts` | Screenshot output path |

## Watch the browser

Open `http://127.0.0.1:6080` in your browser to watch the agent work in real time.

## License

MIT
