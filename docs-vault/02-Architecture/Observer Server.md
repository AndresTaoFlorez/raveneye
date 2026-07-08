---
tags: [architecture]
---

# Observer Server

The Node/TypeScript process (`apps/observer-server/`) that owns the shared browser. It is one of six supervised programs inside the container (the rest form the [Display Stack](./Display%20Stack.md)).

## Responsibilities

1. **Launch the shared Chromium** — `chromium.launchPersistentContext` with `headless: false` on display `:99`, exposing DevTools for the [CDP Endpoint](./CDP%20Endpoint.md). The profile directory depends on the mode, see [Profiles](../05-Operations/Profiles.md).
2. **Serve the [Control API](./Control%20API.md)** on port 8090 — navigation (guarded by the [URL Policy](../06-Security/URL%20Policy.md)), screenshots, captured console/network evidence.
3. **Collect evidence continuously** — an `EvidenceCollector` keeps ring buffers (2000 entries) of console messages, page errors and network activity from the shared context, all passed through [Secret Redaction](../06-Security/Secret%20Redaction.md) at capture time.
4. **Compute [Health Model](./Health%20Model.md) reports** — per-component checks, deliberately excluding the target application.
5. **Watch browser liveness** — if the shared browser dies (crash, or a human closes the window through noVNC), the process exits non-zero and supervisord relaunches everything fresh.

## Startup sequence

```
wait for X socket (/tmp/.X11-unix/X99)
  → launch persistent context (headed)
  → attach evidence collector
  → start Control API
  → navigate to RAVENEYE_TARGET_URL (best-effort: a dead target
    must never take the observer down — see Health Model)
```

## Source map

| File | Role |
|---|---|
| `src/main.ts` | orchestration, watchdog, graceful shutdown |
| `src/browser.ts` | launch, policy-checked navigation, profile cleanup |
| `src/api.ts` | HTTP routes |
| `src/evidence.ts` | ring-buffer collectors |
| `src/health.ts` | component checks |
| `src/config.ts` | environment parsing, see [Configuration](../05-Operations/Configuration.md) |

Related: [Architecture Overview](./Architecture%20Overview.md) · [Shared Browser Model](../01-Overview/Shared%20Browser%20Model.md) · [Docker Design](./Docker%20Design.md)
