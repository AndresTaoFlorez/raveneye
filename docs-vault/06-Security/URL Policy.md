---
tags: [security]
---

# URL Policy

The gate every observer-driven navigation passes: startup target, [[Control API]] `POST /navigate`, [[Observer CLI]], and every `goto`/`navigate` mission step ([[Actions Reference]]).

## Rules

1. **Scheme allow-list** — only `http:` and `https:`. `file:`, `javascript:` and `data:` are always rejected (the observer must never read local files or execute injected script URLs).
2. **Host allow-list** — the hostname must appear in `RAVENEYE_ALLOWED_HOSTS` ([[Configuration]]); matching is exact and case-insensitive, ports are free.
3. Malformed URLs are rejected outright.

Rejections return the reason verbatim, e.g.:

```
scheme "file:" is not allowed (only http/https)
host "example.com" is not in RAVENEYE_ALLOWED_HOSTS (sample-app, host.docker.internal, localhost, 127.0.0.1)
```

The [[Control API]] answers HTTP 422; the [[Mission Runner]] exits 2 for a rejected target.

## Why

- Prevents the observer from becoming an unrestricted proxy or an exfiltration path.
- Keeps agents (and [[CI Mode]] pipelines) inside **authorized** applications by construction.
- Defense in depth alongside the container isolation described in [[Security Model]].

## Scope note

Direct [[Playwright over CDP]] navigation bypasses the observer's code path — a CDP client drives Chromium itself. Loopback-only CDP exposure plus authorized-use discipline covers that surface; the policy governs everything the observer executes on a caller's behalf.

Implementation: `apps/shared/src/url-policy.ts` (`evaluateTargetUrl`), unit-tested in [[Testing]].
