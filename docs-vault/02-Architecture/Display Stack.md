---
tags: [architecture]
---

# Display Stack

The chain that makes a containerized browser visible to a human. Managed by **supervisord** in priority order:

| Priority | Program | Role |
|---|---|---|
| 10 | **Xvfb** | virtual X display `:99`, sized from `RAVENEYE_VIEWPORT_*` (see [[Configuration]]) |
| 20 | **Openbox** | window manager — decorations, stacking, focus |
| 30 | **x11vnc** | VNC server for the display; `-localhost`, so raw VNC never leaves the container |
| 40 | **noVNC / websockify** | bridges TCP 6080 → VNC; the human opens `http://127.0.0.1:6080` (auto-connect + scale) |
| 50 | **socat** | CDP relay, see [[CDP Endpoint]] |
| 60 | **[[Observer Server]]** | launches Chromium *onto* this display |

The human-visible result was proven with a framebuffer capture (`scrot` inside the container) showing the full Chromium window — see [[Project History]].

## Operating the stack

supervisord exposes an RPC socket, so individual components can be managed:

```bash
docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf status
docker compose exec raveneye supervisorctl -c /etc/raveneye/supervisord.conf restart x11vnc
```

Stopping a component degrades the [[Health Model]] (verified: killing x11vnc turns `/health` into HTTP 503 with the exact component flagged).

## Notes

- Logs: each program writes to `/tmp/*.log` inside the container (`make logs` for the aggregate).
- Display-level screenshots (window chrome included): `docker compose exec raveneye bash -c 'DISPLAY=:99 scrot /artifacts/capture.png'`.
- Two browsers can share the display: the shared session plus a [[Mission Runner]] context — both visible in noVNC.

Related: [[Architecture Overview]] · [[Docker Design]] · [[Troubleshooting]]
