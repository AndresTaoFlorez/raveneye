---
tags: [operations]
---

# Troubleshooting

First move, always: `scripts/observer health` — the [[Health Model]] pinpoints the failing component.

## noVNC black screen / connect failure

1. `make logs` — inspect `xvfb`, `x11vnc`, `novnc` output.
2. `supervisorctl … status` then `restart x11vnc` (commands in [[Commands Reference]]).
3. The [[Display Stack]] note explains what each program does.

## Browser window gone / blank

The shared browser died; the [[Observer Server]] watchdog relaunched a fresh session. Re-open your target: `scripts/observer navigate <url>`. If it crash-loops, check `/tmp/observer-server.log` in the container and shared-memory size ([[Fedora Notes]]).

## CDP connection refused

- `curl http://127.0.0.1:9222/json/version` should return Chrome metadata.
- If not, health → is `cdp` ok? Restart the `cdp-proxy` program ([[CDP Endpoint]] explains the socat relay).
- Large Playwright client/server version gaps can misbehave — the container runs 1.61.1.

## Navigation rejected (HTTP 422)

Working as intended: the [[URL Policy]] refused the scheme or host. Add the hostname to `RAVENEYE_ALLOWED_HOSTS` ([[Configuration]]) and `docker compose up -d`.

## Mission problems

- **Exit 2 immediately** → invalid YAML or rejected target; `validate` it ([[Mission Format]]).
- **Element not found** → run stops with a high functional finding; read `report.md`, then `make trace RUN_ID=…` to see the DOM at failure time ([[Artifacts]]).
- **Expected noise flagged** → add `allow` patterns to the check ([[Checks Reference]]).

## Login state disappears

Ephemeral mode wipes by design; switch to persistent and mind the 30-second cookie flush — both explained in [[Profiles]].

## Artifacts missing or wrong owner

SELinux label or uid mismatch — see [[Fedora Notes]].

## Nuclear option

```bash
make down && make build && make up && make health
```

State lives only in `artifacts/` and the profile volume; everything else is disposable.
