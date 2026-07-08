---
tags: [missions]
---

# Findings

A finding is the structured record of one detected problem, written to `findings.json` in the run's [Artifacts](./Artifacts.md) and summarized in `report.md`.

## Fields

| Field | Content |
|---|---|
| `finding_id` | `F-001`, `F-002`, … within the run |
| `category` | `functional` · `visual` · `usability` · `routing` · `accessibility` · `responsive` · `console` · `network` · `performance` · `data-state` · `security` |
| `severity` | `critical` · `high` · `medium` · `low` · `informational` |
| `title` / `description` | what happened |
| `route` | the page URL where it happened |
| `viewport` | dimensions at detection time |
| `reproduction_steps` | the successful mission steps executed up to that point |
| `expected_behavior` / `actual_behavior` | the contrast that makes it actionable |
| `evidence` | which artifact files back the claim (`network.json`, `inspections.json`, …) |
| `suspected_component` | best guess at the culprit (offending element, console location, endpoint) |
| `confidence` | high / medium / low |
| `status` | `open` (triage happens outside the tool) |

## How findings are born

- Each [Checks Reference](./Checks%20Reference.md) rule converts matching evidence into findings.
- A failed step becomes a high `functional` finding automatically ([Mission Runner](./Mission%20Runner.md)).
- `inspect_accessibility` issues surface as low accessibility findings.

## Severity → exit code

Critical/high findings (or a failed step) make the run exit `1`; medium and below exit `0` but remain in the report. This is what makes missions usable as gates in [CI Mode](../05-Operations/CI%20Mode.md).

## Example (real, from the [Reasoning Loop](../04-Agents/Reasoning%20Loop.md) demo)

```json
{
  "finding_id": "F-001",
  "category": "console",
  "severity": "high",
  "title": "Unhandled page error",
  "description": "dlg.showModa is not a function",
  "route": "http://sample-app:3000/",
  "suspected_component": "frontend JavaScript",
  "confidence": "high"
}
```

The description named the exact broken call — the agent fixed the typo and proved it by rerunning the same mission.
