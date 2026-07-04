---
tags: [operations]
---

# Profiles

Browser profiles hold cookies, storage and login state for the **shared session** (missions always run clean ephemeral contexts — see [[Mission Runner]]).

## Ephemeral (default)

- Fresh profile in `/tmp` on every browser start; removed afterwards.
- **Demonstrated**: a cookie set via CDP disappeared after a container restart — clean start guaranteed.
- Right choice for automated work and anything reproducible.

## Persistent

- Profile lives in the `raveneye-profile` named Docker volume (`/browser-profile`), never in the image, never in Git.
- Enables the manual-login workflow: a human logs in through noVNC once; agents then operate the authenticated session ([[Shared Browser Model]]).
- Enable in `.env`: `RAVENEYE_PROFILE_MODE=persistent`, then `docker compose up -d`.
- **Demonstrated**: a login cookie survived a graceful restart.

## The cookie-flush gotcha

Chromium writes cookies to disk **lazily (~30 s)**. A hard kill right after login loses the session. Mitigations in place:

- `stop_grace_period: 30s` in compose gives supervisord's ordered shutdown time to close Chromium cleanly ([[Docker Design]]).
- After logging in manually, give it half a minute before `make down`.

## Reset

```bash
make reset-profile     # stop → wipe volume → restart
```

**Demonstrated**: the retained login cookie was gone after reset. Use it before switching accounts and before sharing evidence, and treat the profile volume as credential storage ([[Security Model]]).

Related: [[Configuration]] · [[Troubleshooting]]
