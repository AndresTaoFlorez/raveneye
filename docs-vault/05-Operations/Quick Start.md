---
tags: [operations]
---

# Quick Start

From zero to a watchable shared browser in four commands:

```bash
cd ~/Projects/ui-observer
cp .env.example .env
make build          # builds both images (first run pulls the Playwright base)
make up             # starts sample-app + ui-observer
```

Open **http://127.0.0.1:6080** — you will see Chromium displaying the [[Sample App]]. That page auto-connects and scales; you are now watching the shared session ([[Shared Browser Model]]).

## Sanity checks

```bash
make health         # all 7 components ok? see Health Model
make smoke          # run the generic-smoke mission → PASSED, exit 0
make artifacts      # list the run that just happened
```

## Point it at *your* application

Full recipe (dockerized apps, network options, per-agent hookup, review mission): [[Observing Your Own App]]. The short version — edit `.env` (see [[Configuration]]):

```dotenv
# App running on your host:
UI_OBSERVER_TARGET_URL=http://host.docker.internal:5173
UI_OBSERVER_ALLOWED_HOSTS=sample-app,host.docker.internal,localhost,127.0.0.1
```

Then `docker compose up -d` (recreates with the new env). The host app must listen on `0.0.0.0`, not just `127.0.0.1` — see [[Fedora Notes]].

Or without restarting, navigate the running browser directly:

```bash
scripts/observer navigate http://host.docker.internal:5173/
```

## Next steps

- Hook up your agent: [[Agent Integration]] ([[Playwright MCP]] for Claude Code/Codex).
- Write a journey for your app: [[Mission Format]], starting from [[Sample Missions]].
- If anything misbehaves: [[Troubleshooting]].

Prerequisites are validated by `scripts/verify-workspace.sh` (Docker + Compose v2, Node ≥ 22, free port 6080).
