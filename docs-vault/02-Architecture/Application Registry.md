---
tags: [architecture, operations]
---

# Application Registry

The Application Registry stores observed apps locally so RavenEye can open known targets without editing `.env`.

The registry lives in SQLite at:

```text
RAVENEYE_DB_PATH
```

Default inside the container:

```text
/artifacts/data/raveneye.sqlite
```

Because `/artifacts` is bind-mounted, registered apps survive container restart. The database stores URLs, allowed hosts, local repo path hints, run mode, viewport defaults, and timestamps. It does not store secrets or API keys.

## SQLite model

Minimum persisted app fields:

```sql
observed_apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  allowed_hosts_json TEXT NOT NULL,
  local_repo_path TEXT,
  run_mode TEXT NOT NULL DEFAULT 'host',
  default_viewport_width INTEGER NOT NULL DEFAULT 1440,
  default_viewport_height INTEGER NOT NULL DEFAULT 900,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Session lifecycle rows are also written locally:

```sql
observer_sessions (
  id TEXT PRIMARY KEY,
  observed_app_id TEXT,
  status TEXT NOT NULL,
  target_url TEXT NOT NULL,
  display TEXT,
  novnc_url TEXT,
  cdp_url TEXT,
  api_url TEXT,
  started_at TEXT NOT NULL,
  stopped_at TEXT
);
```

## Effective URL policy

Opening a registered app uses:

```text
effective_allowed_hosts = RAVENEYE_ALLOWED_HOSTS + observed_app.allowed_hosts
```

The same [URL Policy](../06-Security/URL%20Policy.md) still blocks `file:`, `javascript:`, `data:`, non-http schemes, and hosts outside the effective allow-list.

## Registering a local app

RavenEye ships with a seeded `Sample App` entry pointing at `http://sample-app:3000`, but the sample container is not part of the default stack. Start it with `make smoke` or `docker compose --profile sample up -d sample-app` when you want a known validation target.

1. Run the app so the container can reach it, usually on `0.0.0.0`.
2. Open `http://127.0.0.1:8090/`.
3. Go to Overview.
4. Create an app with `target_url`, for example `http://host.docker.internal:5173`.
5. Add `host.docker.internal` to that app's allowed hosts.
6. Click the app tile to preview it. Use the open-in-new-tab icon to open the backend-provided noVNC URL for that session.

`.env` remains the startup fallback and advanced configuration surface. Repository defaults should stay clean and agnostic: the committed target is RavenEye's local dashboard, while project-specific targets belong in registry rows or a developer's local uncommitted environment.

## Current limitations

- Registry entries do not start or stop target applications.
- Dynamic app sessions use the app's stored viewport defaults.
- There are no model provider settings, secrets, or authentication in this phase.
- The noVNC gateway target is still pending; dynamic sessions currently expose real per-session noVNC ports returned by the backend.

Related: [Local Dashboard](./Local%20Dashboard.md) · [Observing Your Own App](../05-Operations/Observing%20Your%20Own%20App.md) · [Configuration](../05-Operations/Configuration.md)
