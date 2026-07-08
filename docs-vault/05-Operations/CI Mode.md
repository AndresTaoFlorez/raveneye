---
tags: [operations]
---

# CI Mode

Headless mission execution for pipelines — no display, no noVNC, no published ports.

```bash
scripts/ci-run.sh generic-smoke
echo $?    # mission exit code: 0 pass · 1 findings · 2 config · 3 browser
```

## How it works

`docker compose run --rm` starts a **one-off container** from the observer image with `node` as the entrypoint, running the [Mission Runner](../03-Missions/Mission%20Runner.md) CLI directly:

- **No ports are published** — `compose run` skips port mappings by design, so noVNC/CDP/API never exist in CI.
- **No supervisord / X11** — Chromium runs truly headless (`RAVENEYE_HEADLESS=true`).
- **Ephemeral only** — a clean context per run, as [Profiles](./Profiles.md) requires for automation.
- [Artifacts](../03-Missions/Artifacts.md) land in the mounted `artifacts/` exactly as in interactive runs — archive them on failure.
- The git commit is stamped into `manifest.json` for traceability.

## Pipeline sketch

```yaml
# e.g. GitHub Actions / GitLab CI step
- run: docker compose build
- run: scripts/ci-run.sh generic-smoke
- if: failure()
  run: tar czf evidence.tgz artifacts/runs/   # keep report, trace, video, findings
```

Because [Findings](../03-Missions/Findings.md) map severity → exit code (critical/high ⇒ 1), a mission acts as a quality gate: medium/low findings inform without blocking.

## Boundaries

- Remote external targets stay blocked unless their hosts are explicitly added to the allow-list ([URL Policy](../06-Security/URL%20Policy.md)) — CI cannot wander off authorized apps.
- Verified locally: `ci-run.sh generic-smoke` → headless PASSED, exit 0, full artifact tree.

Related: [Testing](./Testing.md) · [Configuration](./Configuration.md) · [Commands Reference](./Commands%20Reference.md)
