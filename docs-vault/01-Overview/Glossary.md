---
tags: [overview]
---

# Glossary

- **Shared session** — the single visible Chromium controlled by both human and agent; see [Shared Browser Model](./Shared%20Browser%20Model.md).
- **noVNC** — browser-based VNC client serving the display at `http://127.0.0.1:6080`; part of the [Display Stack](../02-Architecture/Display%20Stack.md).
- **CDP (Chrome DevTools Protocol)** — the wire protocol agents use to drive the shared browser; see [CDP Endpoint](../02-Architecture/CDP%20Endpoint.md).
- **Observer server** — the Node process that launches the shared browser, serves the [Control API](../02-Architecture/Control%20API.md) and computes the [Health Model](../02-Architecture/Health%20Model.md); see [Observer Server](../02-Architecture/Observer%20Server.md).
- **Mission** — a declarative YAML journey (steps + checks) executed by the [Mission Runner](../03-Missions/Mission%20Runner.md); see [Mission Format](../03-Missions/Mission%20Format.md).
- **Step / Action** — one operation in a mission (`goto`, `click`, `screenshot`, …); see [Actions Reference](../03-Missions/Actions%20Reference.md).
- **Check** — a named rule evaluated after the steps (e.g. `no_horizontal_overflow`); see [Checks Reference](../03-Missions/Checks%20Reference.md).
- **Finding** — a structured problem record with category, severity, reproduction steps and evidence; see [Findings](../03-Missions/Findings.md).
- **Run** — one mission execution, identified by a run-id; leaves a full evidence tree, see [Artifacts](../03-Missions/Artifacts.md).
- **Evidence** — redacted console/page-error/network captures, screenshots, trace, video; see [Secret Redaction](../06-Security/Secret%20Redaction.md).
- **Trace** — Playwright's recorded timeline (`trace.zip`), opened with `make trace RUN_ID=…`.
- **Profile** — Chromium user data; `ephemeral` (default) or `persistent`; see [Profiles](../05-Operations/Profiles.md).
- **URL policy** — scheme + hostname allow-list enforced at every navigation; see [URL Policy](../06-Security/URL%20Policy.md).
- **Allowed hosts** — the `RAVENEYE_ALLOWED_HOSTS` list, see [Configuration](../05-Operations/Configuration.md).
- **Sample app** — "Meridian Notes", the built-in validation target; see [Sample App](../02-Architecture/Sample%20App.md).
- **host.docker.internal** — hostname that lets the container reach applications on the host; see [Fedora Notes](../05-Operations/Fedora%20Notes.md).
- **CI mode** — headless mission execution with no published ports; see [CI Mode](../05-Operations/CI%20Mode.md).
- **supervisord** — the in-container process manager; components listed in [Display Stack](../02-Architecture/Display%20Stack.md).
- **MCP (Model Context Protocol)** — how tool-using agents attach; see [Playwright MCP](../04-Agents/Playwright%20MCP.md).
