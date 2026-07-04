---
tags: [security]
---

# Security Model

RavenEye is a **local development tool**: the trust model assumes a trusted developer workstation and *untrusted target page content*.

## Network: loopback everywhere

- Every published port binds to `127.0.0.1` — noVNC 6080, [[CDP Endpoint]] 9222, [[Control API]] 8090, [[Sample App]] 3000. Nothing is a network service.
- Raw VNC (5900) is **never** published; x11vnc runs `-localhost` inside the container ([[Display Stack]]).
- CDP is unauthenticated by nature — loopback binding *is* the control. Never re-publish or tunnel it to shared machines.

## Container hardening

- Non-root `pwuser` (uid 1000); no privileged mode; no Docker socket mount.
- `no-new-privileges:true`; 4 GB memory limit; 2 GB `/dev/shm` ([[Docker Design]]).
- **Chromium sandbox disabled** — it demands privileges we refuse the container (unprivileged userns / SYS_ADMIN). The container boundary + non-root + loopback-only is the isolation model. Consequence: only point the observer at **authorized targets**.

## Navigation control

Every observer-driven navigation passes the [[URL Policy]] — `http/https` only, hostname allow-list. The observer never fetches on behalf of callers; it is not a proxy.

## Evidence hygiene

All captured evidence passes [[Secret Redaction]] **at capture time**; request/response bodies are never stored. Verified end-to-end with a real bearer token.

## Credentials & artifacts

- Profiles (login state) live in a named volume, never in images or Git; explicit reset available ([[Profiles]]).
- `.env` and `artifacts/` are git-ignored; artifacts can contain screenshots of authorized apps — treat as sensitive, prune with retention cleanup ([[Configuration]]).

## Accepted risks (documented, not hidden)

1. Sandbox-less Chromium inside the container (above).
2. Unauthenticated CDP on loopback.
3. Artifacts are plaintext on the host — protection is filesystem-level.

Related: [[Architecture Overview]] · [[CI Mode]]
