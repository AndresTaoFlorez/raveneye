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

The tool packages a visible Chromium inside Docker (see [Docker Design](../02-Architecture/Docker%20Design.md)) with three ways in:

1. **A human** watches (and can interact) through noVNC — see [Display Stack](../02-Architecture/Display%20Stack.md).
2. **An agent** controls the same session via [Playwright over CDP](../04-Agents/Playwright%20over%20CDP.md), [Playwright MCP](../04-Agents/Playwright%20MCP.md), the [Control API](../02-Architecture/Control%20API.md), or the [Observer CLI](../04-Agents/Observer%20CLI.md).
3. **The [Mission Runner](../03-Missions/Mission%20Runner.md)** executes reproducible YAML journeys and produces [Findings](../03-Missions/Findings.md) backed by [Artifacts](../03-Missions/Artifacts.md) (screenshots, traces, video, console/network/accessibility evidence).

This combination enables the [Reasoning Loop](../04-Agents/Reasoning%20Loop.md): the agent observes rendered reality, captures evidence, fixes the target application (when authorized), reruns the same mission, and proves the fix.

RavenEye is **generic**: it contains no knowledge of any particular product. It works against the bundled [Sample App](../02-Architecture/Sample%20App.md), applications on the host (via `host.docker.internal`), and any authorized URL permitted by the [URL Policy](../06-Security/URL%20Policy.md).

## What it is not

- Not a proxy or crawler — it only navigates a visible browser to authorized targets.
- Not a WCAG certification tool — accessibility inspection is a development aid (see [Checks Reference](../03-Missions/Checks%20Reference.md)).
- Not a general automation framework — missions are deliberately simple (see [Mission Format](../03-Missions/Mission%20Format.md)).

Related: [Shared Browser Model](./Shared%20Browser%20Model.md) · [Project History](./Project%20History.md) · [Security Model](../06-Security/Security%20Model.md)
