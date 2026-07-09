---
tags: [operations]
---

# Quick Start

Use this page when you only want RavenEye running. The default stack starts one service: `raveneye`. It does not start the sample app.

## Start RavenEye

PowerShell:

```powershell
cd D:\Projects\raveneye
Copy-Item .env.example .env
docker compose build raveneye
docker compose up -d
```

Bash:

```bash
cd ~/Projects/raveneye
cp .env.example .env
docker compose build raveneye
docker compose up -d
```

Open:

- Dashboard: `http://127.0.0.1:8090/overview`
- Watched browser: `http://127.0.0.1:6080`

## Check It

PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8090/health | ConvertTo-Json -Depth 5
docker compose ps
```

Bash:

```bash
curl -fsS http://127.0.0.1:8090/health
docker compose ps
```

Expected:

- health status is `ok`;
- `docker compose ps` shows `raveneye`;
- it does not show `sample-app`.

## Fast Fix Loop

Run your real app first. If it runs on your host machine, make sure it listens on `0.0.0.0`, then use `host.docker.internal` from RavenEye.

Example for a Vite app on port 5173:

```bash
npm run dev -- --host 0.0.0.0
```

Navigate RavenEye to it:

```powershell
curl.exe -fsS -X POST http://127.0.0.1:8090/navigate `
  -H "content-type: application/json" `
  -d '{"url":"http://host.docker.internal:5173/"}'
```

Capture quick evidence:

```powershell
curl.exe -fsS -X POST http://127.0.0.1:8090/screenshot `
  -H "content-type: application/json" `
  -d '{"name":"before-fix","full_page":false}'

curl.exe -fsS "http://127.0.0.1:8090/console?clear=1"
curl.exe -fsS "http://127.0.0.1:8090/network?problems=1&clear=1"
```

Fix your app in its own repo, rebuild/restart that app if needed, then repeat the same screenshot and checks.

## Optional Sample App

Only use the sample app when you want to test RavenEye itself:

```bash
docker compose --profile sample up -d sample-app
scripts/run-mission.sh generic-smoke --target-url http://sample-app:3000
```

The sample is intentionally not part of the normal startup.

## Stop

```bash
docker compose down
```

More detail: [Observing Your Own App](./Observing%20Your%20Own%20App.md), [Configuration](./Configuration.md), [Troubleshooting](./Troubleshooting.md).
