# Troubleshooting

Start here: `scripts/observer health` — it pinpoints the failing component.

## noVNC shows a black screen or "failed to connect"

1. `make logs` — check `xvfb`, `x11vnc`, `novnc` supervisord programs.
2. `docker compose exec ui-observer supervisorctl -c /etc/ui-observer/supervisord.conf status`
3. Restart one component:
   `docker compose exec ui-observer supervisorctl -c /etc/ui-observer/supervisord.conf restart x11vnc`

## Browser window is gone / blank page

The shared browser died and was relaunched (health shows `chromium-playwright` recovering).
Re-open your target: `scripts/observer navigate <url>`. If it loops, `make logs` and look
at `/tmp/observer-server.log` inside the container.

## `connectOverCDP` refuses connection

- `curl http://127.0.0.1:9222/json/version` must return Chrome metadata.
- If not: health → is `cdp` ok? The socat relay (`cdp-proxy`) may be down; restart it via
  supervisorctl as above.
- A Playwright client version far newer/older than 1.61 may misbehave against
  Chromium 149; match versions when possible.

## Navigation rejected (HTTP 422)

The URL policy refused it. Add the hostname to `UI_OBSERVER_ALLOWED_HOSTS` in `.env`
and `docker compose up -d` (recreate picks up the env change). `file:`, `javascript:`
and `data:` are never allowed.

## Mission exits 2 immediately

Invalid mission YAML or rejected target. Validate:
`node apps/mission-runner/dist/cli.js validate config/missions/<name>.yaml`.

## Mission can't find an element

Missions stop at the first failed step (high `functional` finding). Check
`report.md` and `screenshots/`, then open the trace: `make trace RUN_ID=<run-id>` —
it shows the exact DOM at failure time.

## Login state disappears

- Ephemeral mode (default) wipes state on every browser start — switch to
  `UI_OBSERVER_PROFILE_MODE=persistent` in `.env` for manual-login workflows.
- Chromium flushes cookies lazily (~30 s). After logging in, give it half a minute
  before stopping the stack; compose is configured with `stop_grace_period: 30s`
  so a normal `make down` shuts down gracefully.

## Artifacts missing or root-owned

SELinux label missing (see docs/fedora.md) or uid mismatch (container writes as uid 1000).

## Everything is broken

```bash
make down && make build && make up && make health
```

The stack is stateless outside `artifacts/` and the profile volume.
