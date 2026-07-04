# Security

ui-observer is a **local development tool**. Its security posture assumes a trusted
developer workstation and untrusted *target page content*.

## Network exposure

- Every published port binds to `127.0.0.1` only (noVNC 6080, CDP 9222, API 8090,
  sample app 3000). Nothing listens on external interfaces.
- Raw VNC (5900) is never published; x11vnc runs with `-localhost` inside the container.
- CDP is unauthenticated by nature — that is why it is loopback-only. Do not re-publish
  it or tunnel it to shared machines.

## Container hardening

- Runs as non-root `pwuser` (uid 1000); no privileged mode; no Docker socket mount.
- `security_opt: no-new-privileges:true`; memory limited to 4 GB; `/dev/shm` sized 2 GB.
- The Chromium sandbox is disabled (`chromiumSandbox: false`) because it requires
  privileges we refuse to grant the container (unprivileged user namespaces / SYS_ADMIN).
  The container boundary + non-root user + loopback-only exposure is the isolation model.
  Do not point the observer at hostile sites; it is for **authorized targets**.

## URL policy

Every navigation entry point (control API, CLI, mission steps, startup target) passes
`evaluateTargetUrl`:

- schemes: `http:`/`https:` only — `file:`, `javascript:`, `data:` always rejected;
- hostname must be in `UI_OBSERVER_ALLOWED_HOSTS` (exact, case-insensitive match).

The observer is not a proxy: it never fetches on behalf of callers, it only navigates
the visible browser.

## Secret redaction

All captured evidence passes through `apps/shared/src/redaction.ts` **at capture time**
(secrets never touch disk):

- headers: `authorization`, `proxy-authorization`, `cookie`, `set-cookie`, `x-api-key`,
  `x-auth-token`, `x-csrf-token`;
- query parameters and object keys matching token/secret/password/api-key/auth/session/credential;
- `Bearer …`/`Basic …` values embedded in console text;
- request/response **bodies are never captured**.

Verified end-to-end: the sample app sends `Authorization: Bearer sample-secret-token-12345`;
network evidence records `[REDACTED]` and the secret substring appears nowhere in the run
artifacts (asserted in tests).

## Profiles and credentials

- `ephemeral` (default): fresh profile per browser start, wiped afterwards. Demonstrated:
  cookies do not survive a restart.
- `persistent`: profile lives in the `ui-observer-profile` named volume — never in the
  image, never in Git. Reset explicitly with `make reset-profile`.
- No credentials are baked into images or compose files; `.env` is git-ignored.

## Artifacts

Evidence can contain screenshots of authorized applications — treat `artifacts/` as
sensitive. It is git-ignored, host-owned (uid 1000), and pruned by
`make cleanup` after `UI_OBSERVER_ARTIFACT_RETENTION_DAYS` (default 14).
