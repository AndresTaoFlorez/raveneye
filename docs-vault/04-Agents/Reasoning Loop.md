---
tags: [agents, overview]
---

# Reasoning Loop

The workflow RavenEye exists to enable — and the one demonstrated end-to-end with a real bug:

```
Agent opens target application
    ↓
Agent follows a user mission          ← Mission Runner
    ↓
Agent observes rendered behavior      ← Shared Browser Model
    ↓
Agent detects friction or failure     ← Findings
    ↓
Agent captures evidence               ← Artifacts
    ↓
Agent inspects code and runtime data
    ↓
Agent identifies the likely cause     ← suspected_component + confidence
    ↓
Agent applies the smallest safe fix   (only when explicitly authorized)
    ↓
Agent reruns tests and the SAME mission
    ↓
Agent compares evidence → confirms or reverts
```

## The demonstrated instance

A defect was planted in the [Sample App](../02-Architecture/Sample%20App.md): `dlg.showModal()` → `dlg.showModa()`, silently breaking the home-page dialog.

| Step | Run | Outcome |
|---|---|---|
| generic-smoke with the bug | `2026-07-04T0223-generic-smoke` | **FAILED, exit 1** — finding F-001 (high): "Unhandled page error: dlg.showModa is not a function"; `screenshots/modal-open.png` shows no modal |
| Root cause | — | the finding's description *names the broken call* |
| Fix | — | one-line revert in `apps/sample-app/server.mjs`, rebuild |
| Same mission again | `2026-07-04T0224-generic-smoke` | **PASSED, exit 0**, findings empty |

Both run directories remain in [Artifacts](../03-Missions/Artifacts.md) as a diffable before/after pair — mechanical comparison via `findings.json`, visual comparison via the two `modal-open.png` files.

## Why it works

- Missions are **deterministic**: same steps, same viewport, clean context every run ([Mission Runner](../03-Missions/Mission%20Runner.md)).
- Findings carry `reproduction_steps`, `expected_behavior` vs `actual_behavior`, and `suspected_component` — enough context to jump into the right file.
- Exit codes make the loop scriptable, including as a gate in [CI Mode](../05-Operations/CI%20Mode.md).

Related: [Agent Integration](./Agent%20Integration.md) · [What is RavenEye](../01-Overview/What%20is%20RavenEye.md)
