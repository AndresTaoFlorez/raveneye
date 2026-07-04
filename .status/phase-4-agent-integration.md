# Phase 4 — Agent integration: COMPLETE

Date: 2026-07-03

## Delivered

- `docs/agent-integration.md`: the five integration surfaces (CDP, Playwright MCP,
  HTTP API, CLI, mission runner), the 7-step observation workflow, Claude Code and
  Codex configuration examples (architecture remains agent-neutral), limitations.

## Demonstrated: the observe → fix → verify loop

A real defect was planted in the sample app (`dlg.showModal()` → `dlg.showModa()`,
breaking the home-page dialog), then found and verified fixed using the same mission:

| Step | Run | Result |
|---|---|---|
| Bug planted, `generic-smoke` run | `2026-07-04T0223-generic-smoke` | **FAILED**, exit 1 — finding F-001 (high, console): "Unhandled page error: dlg.showModa is not a function"; `screenshots/modal-open.png` visually shows the dialog did not open |
| Root cause identified from evidence | — | finding description names the exact broken call |
| Smallest safe fix applied (typo revert) | — | one-line change in `apps/sample-app/server.mjs` |
| Same mission re-run | `2026-07-04T0224-generic-smoke` | **PASSED**, exit 0, findings.json empty |

The evidence pair (failed run + clean run of the identical mission) is on disk under
`artifacts/runs/` and can be diffed mechanically (`findings.json`) or visually
(`screenshots/modal-open.png` in both runs).

## Notes

- The observer itself never modified the target: the fix was a normal code change in the
  target app followed by rebuild — exactly the authorized-agent workflow the tool supports.
