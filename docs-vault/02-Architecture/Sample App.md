---
tags: [architecture, missions]
---

# Sample App

**"Meridian Notes"** (`apps/sample-app/`) — a zero-dependency Node 22 application whose only job is to give the observer *known, controlled behaviors* to detect. Every route exists to exercise one observable state.

| Route | Controlled behavior |
|---|---|
| `/` | normal content, nav, **Open dialog** button + native `<dialog>` modal |
| `/articles`, `/articles/1..3` | multi-page navigation for back/forward history testing |
| `/loading` | skeleton UI while `/api/items` answers after 2.5 s |
| `/error-page` | graceful error state fed by `/api/broken` (HTTP 500) |
| `/long-content` | 40 paragraphs (scroll); `?overflow=1` adds an unbreakable wide block |
| `/responsive` | tile grid; `?broken=1` inserts a fixed 1200 px element that breaks small viewports |
| `/form` | labeled fields **plus one intentionally unlabeled input** (a11y finding bait) |
| `/console-error` | intentional `console.error` + uncaught exception |
| `/network-fail` | fires requests that 404, 500, 403 (with a `Bearer sample-secret-token-12345` header for [Secret Redaction](../06-Security/Secret%20Redaction.md) proof) and one aborted request |
| `/api/slow` | 3 s response for slow-request observation |
| `/healthz` | liveness for the Docker healthcheck |

## Design constraints

- **Zero npm dependencies** — plain `node:http`, inline templates, one CSS file.
- **Generic naming** — no concepts borrowed from any real product (project-independence requirement).
- The intentional defects are *stable*, so [Sample Missions](../03-Missions/Sample%20Missions.md) have deterministic expectations: `error-hunt` must always find them, `generic-smoke` must always pass.

It also served as the target for the [Reasoning Loop](../04-Agents/Reasoning%20Loop.md) demonstration, where a bug was planted in the dialog handler and caught by a mission.

Related: [Docker Design](./Docker%20Design.md) · [Mission Runner](../03-Missions/Mission%20Runner.md) · [Testing](../05-Operations/Testing.md)
