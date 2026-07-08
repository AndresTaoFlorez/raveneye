---
tags: [architecture, sessions]
---

# Multi Observer

Multi Observer lets registered apps open in isolated visual workspaces instead of sharing one browser tab.

Current runtime shape:

```text
base:
  display :99
  noVNC 6080
  CDP 9222

app session 0:
  display :98
  noVNC 6081
  CDP 9223

app session 1:
  display :97
  noVNC 6083
  CDP 9224
```

The exact URLs are returned by the [Control API](./Control%20API.md). The dashboard uses `watchUrl` from `POST /api/apps/:id/open`; agents can use `cdpUrl` from the same response or `GET /cdp-info`.

## Session limit

`RAVENEYE_MAX_SESSIONS` is the startup fallback for maximum dynamic app sessions. The base session is not counted. The effective value is persisted in SQLite and can be changed from Dashboard Settings without editing `.env`.

Example:

```dotenv
RAVENEYE_MAX_SESSIONS=10
```

This permits:

```text
base + 10 dynamic app sessions
```

The persisted setting is stored in `raveneye_settings` inside `RAVENEYE_DB_PATH`.

## noVNC routing status

Implemented now: per-session noVNC ports are published loopback-only and surfaced through backend-owned `watchUrl` values.

Target design still pending:

```text
http://127.0.0.1:6080/
http://127.0.0.1:6080/apps/:appId/novnc
http://127.0.0.1:6080/sessions/:sessionId/novnc
```

Until that gateway exists, consumers must not fabricate path or query-string routes under `6080`.

Related: [Session Model](./Session%20Model.md) · [Application Registry](./Application%20Registry.md) · [Local Dashboard](./Local%20Dashboard.md)
