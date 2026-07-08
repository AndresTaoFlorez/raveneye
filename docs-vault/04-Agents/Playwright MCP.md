---
tags: [agents]
---

# Playwright MCP

For agents that speak the Model Context Protocol, attach the official Playwright MCP server to the [CDP Endpoint](../02-Architecture/CDP%20Endpoint.md) — its snapshot/click/type tools then operate on the human-visible shared browser.

## Claude Code

```bash
claude mcp add raveneye -- npx @playwright/mcp@latest --cdp-endpoint http://127.0.0.1:9222
```

## Codex (one example; any MCP client works alike)

```toml
# ~/.codex/config.toml
[mcp_servers.raveneye]
command = "npx"
args = ["@playwright/mcp@latest", "--cdp-endpoint", "http://127.0.0.1:9222"]
```

## Why this beats a headless MCP browser

- The human **sees every action** the agent takes and can intervene (fix a captcha, log in, point at the problem) — see [Shared Browser Model](../01-Overview/Shared%20Browser%20Model.md).
- Sessions survive agent restarts: the browser belongs to the [Observer Server](../02-Architecture/Observer%20Server.md), not to the MCP process.
- Login state created manually through noVNC is immediately usable by the agent ([Profiles](../05-Operations/Profiles.md)).

## Typical MCP session

1. `browser_snapshot` → see the accessibility tree of the current page.
2. `browser_click` / `browser_type` → interact; the human watches live.
3. `browser_take_screenshot` → immediate visual evidence.
4. For durable, structured evidence switch to the [Mission Runner](../03-Missions/Mission%20Runner.md) and read [Findings](../03-Missions/Findings.md).

## Notes

- Requires the stack to be up (`make up`); check `scripts/observer health` first.
- The MCP server is a CDP *client* — the same limitations as [Playwright over CDP](./Playwright%20over%20CDP.md) apply (no native video/trace on the shared session).

Related: [Agent Integration](./Agent%20Integration.md) · [Observer CLI](./Observer%20CLI.md)
