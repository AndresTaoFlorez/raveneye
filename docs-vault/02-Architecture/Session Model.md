---
tags: [architecture, sessions]
---

# Session Model

A RavenEye session is an observed visual workspace owned by the backend.

Minimum runtime fields:

```text
id
observed_app_id / appId
status / state
target_url / targetUrl
display
novnc_url / novncUrl
cdp_url / cdpUrl
started_at / startedAt
stopped_at / stoppedAt
```

## Base session

The base session preserves the historical RavenEye contract:

- display `:99`;
- noVNC on `http://127.0.0.1:6080/`;
- CDP on `http://127.0.0.1:9222`;
- used by legacy `/navigate`, `/screenshot`, console, network, CLI, and missions.

The base session is always visible and does not count against `RAVENEYE_MAX_SESSIONS`.

## Dynamic app sessions

Opening an app through `POST /api/apps/:id/open` creates or reuses a dynamic session for that app. Each dynamic session has its own:

- Xvfb display;
- x11vnc server;
- websockify/noVNC port;
- Chromium profile;
- CDP port.

The dashboard and agents must read the real URLs from the backend response. They must not infer session identity from target URLs, hostnames, or open pages.

Related: [Multi Observer](./Multi%20Observer.md) · [Local Dashboard](./Local%20Dashboard.md) · [Control API](./Control%20API.md)
