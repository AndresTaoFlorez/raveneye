---
tags: [agents]
---

# Agent Integration

RavenEye is **agent-neutral**: any coding agent that can run a shell command, speak HTTP, or drive Playwright can use it. The human always watches the same session ([[Shared Browser Model]]).

## The five surfaces

| Surface | Note | Best for |
|---|---|---|
| [[Playwright over CDP]] | full control of the shared browser | scripted interaction, complex flows |
| [[Playwright MCP]] | MCP server attached to the same browser | Claude Code, Codex, any MCP client |
| [[Control API]] | plain HTTP on :8090 | navigation/screenshots/evidence without Playwright |
| [[Observer CLI]] | `scripts/observer …` | shell-driven agents and humans |
| [[Mission Runner]] | declarative journeys | reproducible evidence, regression gates |

All surfaces funnel navigation through the [[URL Policy]].

## The 7-step observation workflow

1. **Start** — `make up`; confirm with `scripts/observer health` ([[Health Model]]).
2. **Open the target** — `scripts/observer navigate <url>`; host apps via `host.docker.internal` ([[Docker Design]]).
3. **Inspect** — MCP/CDP snapshot, `POST /screenshot`, `GET /console`, `GET /network?problems=1`.
4. **Act** — clicks and typing over CDP/MCP, visible to the human in real time.
5. **Capture evidence** — run a mission; get the full [[Artifacts]] tree.
6. **Read findings** — `findings.json` (machine) / `report.md` (human).
7. **Repeat after changes** — rerun the *same* mission; compare findings and exit codes. This is the [[Reasoning Loop]].

> [!tip] Give your agent the manual
> `AGENTS.md` at the repo root contains these instructions written *for the agent itself* — exact commands, JSON shapes, rules. See [[Instructions for AI Agents]].

## Ground rules for agents

- The observer never modifies target applications; code changes require explicit authorization and repo access.
- Detaching (`browser.close()` on a CDP client) never kills the shared session.
- Evidence is already redacted ([[Secret Redaction]]) — safe to quote in reports.
