# Phase 1 — Visible browser: COMPLETE (pending human visual confirmation)

Date: 2026-07-03

## Delivered

- `apps/sample-app`: zero-dependency Node 22 app ("Meridian Notes") with controlled routes:
  normal content + modal (`/`), loading (`/loading`), controlled error (`/error-page`),
  long content + optional overflow (`/long-content?overflow=1`), responsive + optional break
  (`/responsive?broken=1`), form with intentional a11y gap (`/form`), console error
  (`/console-error`), failed/aborted/secret-bearing requests (`/network-fail`), articles for
  back/forward navigation, `/healthz`.
- `apps/observer-server`: Docker image on `mcr.microsoft.com/playwright:v1.61.1-noble` with
  Xvfb + Openbox + x11vnc (localhost-only) + noVNC/websockify + socat CDP relay + supervisord,
  running as non-root `pwuser` (uid 1000). Node observer process launches one shared visible
  Chromium via `launchPersistentContext` and serves the control API (`/health`, `/status`,
  `POST /navigate` with URL policy).
- `compose.yaml`: loopback-only ports (6080 noVNC, 9222 CDP, 8090 API, 3000 sample app),
  `:z` SELinux label on artifacts mount, profile volume, `host.docker.internal:host-gateway`,
  `no-new-privileges`, 2 GB shm, 4 GB memory limit.

## Verification record (all run 2026-07-03)

| Check | Command | Result |
|---|---|---|
| Images build | `docker compose build` | both images built |
| Services start | `docker compose up -d` | both containers healthy |
| Observer health | `curl 127.0.0.1:8090/health` | `status: ok`, 7/7 components ok |
| noVNC on loopback | `curl 127.0.0.1:6080/` | 200, redirects to vnc.html autoconnect |
| CDP from host | `curl 127.0.0.1:9222/json/version` | Chrome/149.0.7827.55 |
| Sample app | `curl 127.0.0.1:3000/` | 200 |
| Agent attaches to shared browser | host-side Playwright `connectOverCDP` | attached; page url `http://sample-app:3000/` |
| Chromium renders sample app | CDP page screenshot | `artifacts/phase1-visible-browser-proof.png` |
| Display shows headed Chromium | `scrot` of X framebuffer `:99` | `artifacts/phase1-novnc-display-proof.png` |

## Gate

Awaiting the developer opening `http://127.0.0.1:6080` and confirming the visible browser
(mandatory demonstration #6). Framebuffer evidence already captured.

## Notes / decisions

- Headed Chromium binds CDP to container-loopback only; socat republishes it on 9222 so the
  loopback-published host port works. Raw VNC (5900) is never published.
- Chromium runs with `chromiumSandbox: false`: the container (non-root, no-new-privileges)
  is the isolation boundary. Documented in docs-vault/06-Security/Security Model.md (Phase 5).
- Playwright's bundled ffmpeg has no x11grab; `scrot` added to the image for display-level captures.
