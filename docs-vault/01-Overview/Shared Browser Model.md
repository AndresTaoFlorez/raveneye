---
tags: [overview, architecture]
---

# Shared Browser Model

The core idea: **one visible Chromium session, two controllers**.

```
Human developer
      │ watches through noVNC (http://127.0.0.1:6080)
      ▼
Shared visible Chromium (Docker, display :99)
      ▲
      │ Playwright CDP · MCP · HTTP API · CLI
Coding agent
```

The [Observer Server](../02-Architecture/Observer%20Server.md) launches one long-lived headed Chromium via Playwright's `launchPersistentContext` on the virtual display provided by the [Display Stack](../02-Architecture/Display%20Stack.md). That single session is simultaneously:

- **streamed to the human** through x11vnc → noVNC,
- **exposed to agents** through the [CDP Endpoint](../02-Architecture/CDP%20Endpoint.md) on `127.0.0.1:9222`.

Anything the agent does (click, type, navigate) is instantly visible to the human. Anything the human does (e.g. logging in manually through noVNC, see [Profiles](../05-Operations/Profiles.md)) is visible to the agent. This was demonstrated with framebuffer evidence — an agent-triggered modal captured on the actual X display (`artifacts/phase2-shared-control-modal.png`, see [Project History](./Project%20History.md)).

## The one deliberate exception

The [Mission Runner](../03-Missions/Mission%20Runner.md) does **not** reuse the shared CDP session. It launches its *own clean Playwright context* — on the same display, so the human still watches every step live — because Playwright's native trace and video recording is only fully supported on contexts Playwright itself creates. `connectOverCDP` has documented feature limitations.

| Mode | Browser | Human sees it | Recording |
|---|---|---|---|
| Interactive | shared session | ✔ | screenshots via [Control API](../02-Architecture/Control%20API.md) |
| Evaluation | mission-owned context | ✔ (same display) | full trace + video + HAR-grade network |

Both modes satisfy the project's shared-browser requirement; the trade-off is documented honestly rather than claimed away.

Related: [Architecture Overview](../02-Architecture/Architecture%20Overview.md) · [Agent Integration](../04-Agents/Agent%20Integration.md) · [Reasoning Loop](../04-Agents/Reasoning%20Loop.md)
