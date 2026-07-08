---
tags: [missions]
---

# Sample Missions

Three missions ship in `config/missions/`, each with a deterministic expectation against the [Sample App](../02-Architecture/Sample%20App.md). They double as living examples of the [Mission Format](./Mission%20Format.md).

## generic-smoke — *must pass*

Basic visual and interaction validation of a happy path: home page, `Open dialog` modal, Escape to close, long-content scroll, overflow check, back/forward history, console/network capture. Declares all six [Checks Reference](./Checks%20Reference.md) with `favicon.ico` allow-listed.

```bash
make smoke        # expected: PASSED, 0 findings, exit 0
```

## error-hunt — *must fail*

Visits `/console-error` and `/network-fail`, the routes with intentional defects. Proves the observer actually detects problems:

```bash
make mission MISSION=error-hunt   # expected: FAILED, exit 1
```

Verified result: 9 [Findings](./Findings.md) — uncaught exception (high), HTTP 500 (high), aborted request (high), console errors (medium), HTTP 403/404 (medium) — with the `Authorization` header shown as `[REDACTED]` in `network.json` ([Secret Redaction](../06-Security/Secret%20Redaction.md)).

## responsive-sweep — *finds layout breakage*

Loads `/responsive?broken=1` (fixed 1200 px element) and re-checks horizontal overflow at 1440 → 820 → 390 px using `set_viewport` ([Actions Reference](./Actions%20Reference.md)).

Verified result: 3 medium findings, each naming `div.card` as the offender with exact geometry (`scroll 1232px > client 375px` at phone width).

## Writing your own

Copy one of these as a starting point, keep the name kebab-case, and validate before running:

```bash
node apps/mission-runner/dist/cli.js validate config/missions/my-journey.yaml
make mission MISSION=my-journey
```

Point it at your own application via `target_url:` or [Configuration](../05-Operations/Configuration.md) — remember the host must be in the [URL Policy](../06-Security/URL%20Policy.md) allow-list.
