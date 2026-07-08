---
tags: [missions, reference]
---

# Checks Reference

Checks run **after** the steps, against the evidence collected during the run, and emit [Findings](./Findings.md). Declared in the `checks:` list of the [Mission Format](./Mission%20Format.md).

| Check | Trigger | Finding severity |
|---|---|---|
| `no_unhandled_page_errors` | any uncaught exception | high |
| `no_critical_console_errors` | any `console.error` | medium |
| `no_unexpected_failed_requests` | failed/aborted or HTTP ≥ 400 | high (5xx/network failure) · medium (4xx) |
| `no_horizontal_overflow` | `scrollWidth > clientWidth` | medium, with offender elements + geometry |
| `interactive_controls_visible` | zero-size, off-viewport, or < 24 px hit targets | medium |
| `keyboard_navigation_available` | Tab reaches < 2 distinct elements | high |

## Allow patterns

Every check accepts an object form with substring allow-listing for expected noise:

```yaml
checks:
  - name: no_unexpected_failed_requests
    allow: ["favicon.ico", "/api/optional-telemetry"]
```

Patterns match against the message, URL **and** console location (so a favicon 404 whose text does not contain "favicon" is still filtered).

## Automatic end-of-run inspections

If a mission declares `interactive_controls_visible`, `keyboard_navigation_available`, or `no_horizontal_overflow` but never ran the corresponding inspection step, the [Mission Runner](./Mission%20Runner.md) performs it automatically on the final page.

## Beyond the named checks

- A failed **step** always yields a high `functional` finding (no check needed).
- `inspect_accessibility` issues (missing labels/accessible names/alt) are emitted as low-severity accessibility findings — a development aid, not WCAG certification.

Related: [Actions Reference](./Actions%20Reference.md) · [Artifacts](./Artifacts.md)
