---
tags: [agents, operations]
---

# Observer CLI

`scripts/observer` — a dependency-free bash wrapper over the [[Control API]], ideal for shell-driven agents and quick human checks.

```bash
scripts/observer health                # component health, pretty-printed
scripts/observer status                # pages, profile mode, allowed hosts
scripts/observer cdp-info              # how to attach via CDP
scripts/observer navigate <url>        # policy-checked navigation
scripts/observer screenshot [name] [--full]
scripts/observer console [--clear]     # captured console + page errors
scripts/observer network [--problems] [--clear]
```

## Examples

```bash
# Open the sample app's failure page, then read what broke
scripts/observer navigate http://sample-app:3000/network-fail
sleep 3
scripts/observer network --problems
# → 404 /api/missing, 500 /api/broken, 403 /api/secure-data
#   (authorization: [REDACTED] — see Secret Redaction)
```

```bash
# Point the shared browser at an app running on the host
scripts/observer navigate http://host.docker.internal:8123/
scripts/observer screenshot host-app
# → artifacts/screenshots/<timestamp>-host-app.png
```

## Notes

- Port comes from `RAVENEYE_API_PORT` (default 8090, see [[Configuration]]).
- Navigation failures return the [[URL Policy]] reason verbatim — useful for agents to self-correct.
- For journeys that need durable evidence, use the [[Mission Runner]] instead; the CLI is for interactive poking.

Related: [[Agent Integration]] · [[Commands Reference]]
