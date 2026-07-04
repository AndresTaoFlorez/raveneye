---
tags: [overview]
---

# Glossary

- **Shared session** — the single visible Chromium controlled by both human and agent; see [[Shared Browser Model]].
- **noVNC** — browser-based VNC client serving the display at `http://127.0.0.1:6080`; part of the [[Display Stack]].
- **CDP (Chrome DevTools Protocol)** — the wire protocol agents use to drive the shared browser; see [[CDP Endpoint]].
- **Observer server** — the Node process that launches the shared browser, serves the [[Control API]] and computes the [[Health Model]]; see [[Observer Server]].
- **Mission** — a declarative YAML journey (steps + checks) executed by the [[Mission Runner]]; see [[Mission Format]].
- **Step / Action** — one operation in a mission (`goto`, `click`, `screenshot`, …); see [[Actions Reference]].
- **Check** — a named rule evaluated after the steps (e.g. `no_horizontal_overflow`); see [[Checks Reference]].
- **Finding** — a structured problem record with category, severity, reproduction steps and evidence; see [[Findings]].
- **Run** — one mission execution, identified by a run-id; leaves a full evidence tree, see [[Artifacts]].
- **Evidence** — redacted console/page-error/network captures, screenshots, trace, video; see [[Secret Redaction]].
- **Trace** — Playwright's recorded timeline (`trace.zip`), opened with `make trace RUN_ID=…`.
- **Profile** — Chromium user data; `ephemeral` (default) or `persistent`; see [[Profiles]].
- **URL policy** — scheme + hostname allow-list enforced at every navigation; see [[URL Policy]].
- **Allowed hosts** — the `RAVENEYE_ALLOWED_HOSTS` list, see [[Configuration]].
- **Sample app** — "Meridian Notes", the built-in validation target; see [[Sample App]].
- **host.docker.internal** — hostname that lets the container reach applications on the host; see [[Fedora Notes]].
- **CI mode** — headless mission execution with no published ports; see [[CI Mode]].
- **supervisord** — the in-container process manager; components listed in [[Display Stack]].
- **MCP (Model Context Protocol)** — how tool-using agents attach; see [[Playwright MCP]].
