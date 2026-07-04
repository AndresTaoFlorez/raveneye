---
tags: [overview]
---

# What is RavenEye

RavenEye is a standalone development tool that gives a coding agent **eyes and hands in a real browser** while a human watches the same session live. It exists because many real problems are invisible to code inspection, unit tests, and even basic E2E tests:

- broken layouts, horizontal overflow, clipped or hidden controls
- elements rendered outside the viewport, wrong stacking, broken modals
- missing loading/error feedback, broken back/forward behavior
- console errors and failed network requests nobody noticed
- interfaces that *technically work* but feel confusing to use

The tool packages a visible Chromium inside Docker (see [[Docker Design]]) with three ways in:

1. **A human** watches (and can interact) through noVNC — see [[Display Stack]].
2. **An agent** controls the same session via [[Playwright over CDP]], [[Playwright MCP]], the [[Control API]], or the [[Observer CLI]].
3. **The [[Mission Runner]]** executes reproducible YAML journeys and produces [[Findings]] backed by [[Artifacts]] (screenshots, traces, video, console/network/accessibility evidence).

This combination enables the [[Reasoning Loop]]: the agent observes rendered reality, captures evidence, fixes the target application (when authorized), reruns the same mission, and proves the fix.

RavenEye is **generic**: it contains no knowledge of any particular product. It works against the bundled [[Sample App]], applications on the host (via `host.docker.internal`), and any authorized URL permitted by the [[URL Policy]].

## What it is not

- Not a proxy or crawler — it only navigates a visible browser to authorized targets.
- Not a WCAG certification tool — accessibility inspection is a development aid (see [[Checks Reference]]).
- Not a general automation framework — missions are deliberately simple (see [[Mission Format]]).

Related: [[Shared Browser Model]] · [[Project History]] · [[Security Model]]
