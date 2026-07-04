---
tags: [agents, reference]
---

# Instructions for AI Agents

The human documentation you are reading has a machine-facing counterpart: **`AGENTS.md` at the repository root** — instructions written *for the agents themselves*, since being an agent's eyes and hands is this tool's primary function ([[What is UI Observer]]).

## What AGENTS.md contains

Written imperatively for a model, not narratively for a person:

1. **Precondition protocol** — check `/health` before anything; what each failure looks like and the exact recovery command.
2. **Surface selection table** — when to use CDP, MCP, HTTP API, CLI or missions (all drive the same visible browser, [[Shared Browser Model]]).
3. **Exact API shapes** — routes with request/response JSON, so the agent can parse instead of guess ([[Control API]]).
4. **Hard rules** — never bypass the [[URL Policy]] (a 422 means *ask the human*, not *retry differently*); never expose the loopback ports; detach instead of killing the browser; never modify target apps without authorization; treat [[Artifacts]] as sensitive; re-read state if the human grabbed the mouse.
5. **The standard workflow** — the 9-step observe → evidence → fix → re-run loop ([[Reasoning Loop]]) with exit codes as gates.
6. **How to read a run** — start at `findings.json`, use `suspected_component` to jump into the target's code ([[Findings]]).
7. **Mission authoring cheatsheet** — the 22 actions, 6 checks and locator strategies in compact form ([[Mission Format]]).
8. **Target-reaching recipes** — sample app, `host.docker.internal`, `docker network connect` (the compact version of [[Observing Your Own App]]).
9. **Repo conventions** — build/test/lint commands, for agents asked to modify ui-observer itself.

There is also a root `CLAUDE.md` that Claude Code auto-loads; it simply points to `AGENTS.md`.

## How to give these instructions to your agent

- **Claude Code / Codex**: nothing to do — both auto-read `CLAUDE.md`/`AGENTS.md` when working in the repo.
- **Any other agent**: paste `AGENTS.md` into its context, or tell it: *"Read ~/Projects/ui-observer/AGENTS.md and follow it to inspect http://…"*.
- Working from another folder (your app's repo): give the agent the absolute path — the surfaces are just localhost ports, reachable from anywhere on the machine.

## Why a separate document

Humans want *why* and context; agents want *exact commands, shapes, and decision rules*. Mixing both makes each worse. The vault is the why; `AGENTS.md` is the protocol. Keep them consistent: if a port, route or rule changes, update both (see [[Configuration]]).
