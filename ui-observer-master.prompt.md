# UI Observer — Standalone Project Master Prompt

## Mission

Create a brand-new standalone project at:

```text
~/Projects/ui-observer
```

Build it from scratch.

Do not copy, move, import, depend on, or reuse implementation files from any existing application repository.

Do not include references to any previous project, domain, routes, fixtures, documentation, environment variables, naming conventions, or architecture.

The result must be a generic tool that can observe and interact with any authorized web application.

## Core concept

`ui-observer` must allow a coding agent and a human developer to observe and interact with the same real browser session.

The intended experience is similar to a shared Zoom call with a browser:

```text
Human developer
        │
        │ watches through noVNC
        ▼
Shared visible Chromium session
        ▲
        │ controlled through Playwright, CDP, MCP, or a control API
        │
Coding agent
```

The coding agent must be able to:

- Open a real browser.
- See the rendered application.
- Navigate.
- Click.
- Type.
- Scroll.
- Resize the viewport.
- Inspect visual states.
- Inspect DOM and accessibility information.
- Inspect console errors and warnings.
- Inspect failed and slow network requests.
- Capture screenshots.
- Record traces.
- Record video.
- Reproduce problems.
- Reason about likely root causes.
- Fix a target application when explicitly authorized.
- Repeat the same user journey.
- Confirm that the problem was actually resolved.

The purpose is to improve agent reasoning through real visual and interaction evidence, not only source code and automated test output.

## Primary objective

Build a reusable development tool that helps coding agents detect and fix issues that ordinary code inspection, unit tests, and basic E2E tests often miss.

Examples:

- Broken layouts.
- Hidden controls.
- Horizontal overflow.
- Elements outside the viewport.
- Incorrect stacking.
- Confusing navigation.
- Poor information hierarchy.
- Missing loading or error feedback.
- Broken browser back/forward behavior.
- Bad spacing.
- Weak responsive behavior.
- Accessibility problems.
- Visual inconsistencies.
- Console errors.
- Failed network requests.
- Interfaces that technically work but feel difficult or confusing to use.

## Project independence

The repository must be completely independent.

It must:

- Have its own Git repository.
- Have its own Compose file.
- Have its own README and documentation.
- Have its own environment configuration.
- Have its own tests.
- Have a generic sample web application for validation.
- Require no other repository.
- Work with authorized applications on the host.
- Work with applications in Docker networks.
- Work with authorized remote web applications.
- Contain no project-specific business knowledge.

Do not inspect other repositories for code to reuse.

You may use official documentation and public dependencies.

## Workspace rules

Before writing files:

```bash
mkdir -p ~/Projects/ui-observer
cd ~/Projects/ui-observer
pwd
```

The expected path is:

```text
/home/mothius/Projects/ui-observer
```

Initialize a new repository:

```bash
git init
```

Do not modify any other repository.

Do not delete or migrate older implementations from other locations.

## Suggested repository structure

Create a structure equivalent to:

```text
ui-observer/
├── compose.yaml
├── .env.example
├── .gitignore
├── Makefile
├── README.md
├── apps/
│   ├── observer-server/
│   ├── mission-runner/
│   └── sample-app/
├── config/
│   ├── missions/
│   └── policies/
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── missions.md
│   ├── agent-integration.md
│   ├── fedora.md
│   └── troubleshooting.md
├── scripts/
│   ├── verify-workspace.sh
│   ├── start.sh
│   ├── stop.sh
│   ├── reset-profile.sh
│   ├── run-mission.sh
│   └── cleanup-artifacts.sh
├── artifacts/
│   └── .gitkeep
├── tests/
└── .status/
```

You may improve the structure, but keep responsibilities clear and maintenance simple.

## Required components

### Observer server

The observer server must provide:

- Chromium.
- Xvfb.
- A lightweight window manager.
- x11vnc.
- noVNC.
- websockify.
- Playwright.
- Browser profile management.
- Health checks.
- Artifact storage.
- A control mechanism for coding agents.

The developer must be able to watch the browser at:

```text
http://127.0.0.1:6080
```

The port must be configurable.

### Mission runner

The mission runner must:

- Read declarative mission files.
- Start or connect to the browser.
- Navigate to a target URL.
- Execute actions.
- Capture evidence.
- Generate a structured report.
- Return meaningful exit codes.

It must not be coupled to a particular application.

### Sample application

Create a small generic sample application only for validating the observer.

Include controlled routes or states for:

- Normal content.
- Loading.
- Controlled error.
- Modal interaction.
- Long content.
- Responsive layout.
- Form interaction.
- Console error.
- Failed network request.
- Browser navigation.

Do not use concepts or names from any external project.

## Technology stack

Prefer:

```text
Node.js 22 LTS
TypeScript
Playwright
Docker
Docker Compose
Chromium
Xvfb
Openbox or Fluxbox
x11vnc
noVNC
websockify
Supervisor or s6-overlay
YAML mission files
Vitest
ESLint
Prettier
```

Rules:

- Pin important versions.
- Do not use `latest`.
- Do not download browsers on every container start.
- Prefer official images and packages.
- Keep dependencies minimal.
- Document upgrades.

## Docker design

Create at least:

```text
sample-app
ui-observer
```

The `ui-observer` service must:

- Bind noVNC only to loopback by default.
- Avoid exposing raw VNC.
- Avoid privileged mode.
- Avoid mounting the Docker socket.
- Run as non-root when practical.
- Use sufficient `/dev/shm`.
- Store profiles in a dedicated volume.
- Store artifacts in a host-mounted directory.
- Reach host apps using `host.docker.internal`.
- Reach Compose services by service name.
- Accept a configurable target URL.

Use a design equivalent to:

```yaml
services:
  ui-observer:
    build:
      context: .
      dockerfile: apps/observer-server/Dockerfile
    environment:
      DISPLAY: ":99"
      UI_OBSERVER_TARGET_URL: "${UI_OBSERVER_TARGET_URL:-http://sample-app:3000}"
      UI_OBSERVER_NOVNC_PORT: "${UI_OBSERVER_NOVNC_PORT:-6080}"
      UI_OBSERVER_VIEWPORT_WIDTH: "${UI_OBSERVER_VIEWPORT_WIDTH:-1440}"
      UI_OBSERVER_VIEWPORT_HEIGHT: "${UI_OBSERVER_VIEWPORT_HEIGHT:-900}"
      UI_OBSERVER_PROFILE_MODE: "${UI_OBSERVER_PROFILE_MODE:-ephemeral}"
      UI_OBSERVER_RECORD_VIDEO: "${UI_OBSERVER_RECORD_VIDEO:-true}"
      UI_OBSERVER_RECORD_TRACE: "${UI_OBSERVER_RECORD_TRACE:-true}"
    ports:
      - "127.0.0.1:${UI_OBSERVER_NOVNC_PORT:-6080}:6080"
    volumes:
      - ./artifacts:/artifacts
      - ui-observer-profile:/browser-profile
    extra_hosts:
      - "host.docker.internal:host-gateway"
    shm_size: "2gb"
    security_opt:
      - no-new-privileges:true
```

Adapt it as needed.

## Operating modes

### Interactive mode

Must support:

- Visible browser.
- noVNC observation.
- Agent interaction.
- Manual authentication when needed.
- Optional persistent profile.
- Profile reset.
- Navigation to arbitrary authorized targets.

### Evaluation mode

Must support:

- Clean browser context.
- Reproducible viewport.
- Automated mission execution.
- Trace recording.
- Video recording.
- Screenshots.
- Console collection.
- Page error collection.
- Network collection.
- Structured findings.
- Exit codes suitable for automation.

## Shared-browser requirement

The preferred result is that the human and coding agent observe and control the same Chromium session.

Investigate the most stable approach, such as:

- Playwright connecting to an existing Chromium instance over CDP.
- Persistent Playwright browser server.
- A custom browser-control API.
- Playwright MCP attached to the same browser.

Do not claim shared control unless you demonstrate it.

If exact shared control is unreliable, document the limitation and implement the closest stable design where the human watches the browser used by the mission runner.

## Agent integration

Keep the core agent-neutral.

Support one or more of:

- Playwright MCP.
- CDP endpoint.
- HTTP control API.
- CLI commands.
- Mission-runner commands.

Document how a coding agent can:

1. Start the observer.
2. Open a target application.
3. Inspect the current page.
4. Perform actions.
5. Capture evidence.
6. Read findings.
7. Repeat the same mission after code changes.

Codex may be documented as an example, but the architecture must remain generic.

## Target configuration

Add at least:

```dotenv
UI_OBSERVER_TARGET_URL=http://sample-app:3000
UI_OBSERVER_ALLOWED_HOSTS=sample-app,host.docker.internal,localhost,127.0.0.1
UI_OBSERVER_NOVNC_PORT=6080
UI_OBSERVER_VIEWPORT_WIDTH=1440
UI_OBSERVER_VIEWPORT_HEIGHT=900
UI_OBSERVER_PROFILE_MODE=ephemeral
UI_OBSERVER_RECORD_VIDEO=true
UI_OBSERVER_RECORD_TRACE=true
UI_OBSERVER_ARTIFACT_RETENTION_DAYS=14
```

Validate target URLs.

Reject dangerous schemes including:

```text
file:
javascript:
data:
```

Do not turn the observer into an unrestricted proxy.

## Mission format

Create a small declarative YAML format.

Example:

```yaml
name: generic-smoke
description: Basic visual and interaction validation
target_url: http://sample-app:3000

viewport:
  width: 1440
  height: 900

steps:
  - action: goto
    path: /
  - action: wait_for_ready
  - action: screenshot
    name: home
  - action: inspect_accessibility
  - action: click
    role: button
    name: Open modal
  - action: screenshot
    name: modal-open
  - action: press
    key: Escape
  - action: navigate
    path: /long-content
  - action: check_horizontal_overflow
  - action: capture_console
  - action: capture_network

checks:
  - no_unhandled_page_errors
  - no_critical_console_errors
  - no_unexpected_failed_requests
  - no_horizontal_overflow
  - interactive_controls_visible
  - keyboard_navigation_available
```

Use typed validation.

Do not build a full programming language.

## Required actions

Support at least:

```text
goto
navigate
reload
back
forward
click
fill
type
press
select
check
uncheck
hover
scroll
wait
wait_for_ready
wait_for_selector
screenshot
inspect_accessibility
capture_console
capture_network
check_horizontal_overflow
set_viewport
```

Document unsupported actions honestly.

## Evidence and artifacts

Every mission must create:

```text
artifacts/
└── runs/
    └── <run-id>/
        ├── manifest.json
        ├── report.md
        ├── findings.json
        ├── actions.json
        ├── console.json
        ├── page-errors.json
        ├── network.json
        ├── accessibility.json
        ├── trace.zip
        ├── video/
        └── screenshots/
```

`manifest.json` must include:

```text
run_id
mission_name
target_url
started_at
completed_at
git_commit
observer_version
browser_version
playwright_version
viewport
profile_mode
status
artifact_paths
```

Each finding must include:

```text
finding_id
category
severity
title
description
route
viewport
reproduction_steps
expected_behavior
actual_behavior
evidence
suspected_component
confidence
status
```

Categories:

```text
functional
visual
usability
routing
accessibility
responsive
console
network
performance
data-state
security
```

Severities:

```text
critical
high
medium
low
informational
```

## Visual inspection

Support detection or evidence for:

- Horizontal overflow.
- Clipped content.
- Hidden controls.
- Elements outside the viewport.
- Overlapping content.
- Broken modals.
- Stacking issues.
- Very small controls.
- Missing focus indicators.
- Broken responsive layouts.
- Empty states.
- Loading states.
- Error states.
- Long text.
- Large tables.
- Scroll problems.
- Inconsistent spacing.
- Unreadable contrast.
- Weak visual hierarchy.

Do not rely only on DOM presence.

Use screenshots and rendered geometry.

## Accessibility inspection

Capture:

- Accessibility tree.
- Missing accessible names.
- Invalid roles.
- Keyboard focus order.
- Keyboard reachability.
- Missing labels.
- Focus traps.
- Modal behavior.
- Contrast problems when measurable.

This is a development aid, not a formal certification system.

## Console and network inspection

Capture:

- Console errors and warnings.
- Unhandled exceptions.
- Page errors.
- Failed requests.
- HTTP 4xx and 5xx responses.
- CORS failures.
- Aborted requests.
- Slow requests.
- Redirect loops.
- WebSocket failures when observable.

Redact:

- Authorization headers.
- Cookies.
- Tokens.
- Passwords.
- Sensitive query parameters.
- Request bodies by default.

## Profiles and authentication

Support:

```text
ephemeral
persistent
```

Ephemeral mode:

- Starts clean.
- Is the default for automated missions.
- Removes session data after completion.

Persistent mode:

- Uses a dedicated Docker volume.
- Allows manual login through noVNC.
- Never stores credentials in Git.
- Can be reset explicitly.

Provide commands to create, use, inspect, and reset profiles.

## Security

Implement:

- noVNC bound to `127.0.0.1`.
- No public VNC.
- No privileged containers.
- No Docker socket mount.
- No credentials in images.
- Secret redaction.
- Allowed-host policy.
- URL validation.
- Artifact retention.
- Controlled profile deletion.
- Non-root execution when practical.
- `no-new-privileges`.
- Resource limits when practical.

The browser must only access authorized targets.

## Health model

Expose a health endpoint or command that checks:

- Xvfb.
- Window manager.
- noVNC.
- Chromium.
- Playwright connection.
- Control interface.
- Artifact directory.

Separate:

```text
observer health
target application health
mission result
```

A broken target application must not make the observer container unhealthy.

## Commands

Provide simple commands:

```bash
make build
make up
make down
make restart
make logs
make open
make health
make reset-profile
make smoke
make mission MISSION=generic-smoke
make artifacts
make trace RUN_ID=<run-id>
make cleanup
make test
```

`make open` may print the URL instead of opening it automatically.

## Testing

Add:

- Unit tests for mission validation.
- Unit tests for URL policy.
- Unit tests for redaction.
- Unit tests for finding generation.
- Integration tests for Playwright control.
- Integration tests for artifact creation.
- Integration tests for health checks.
- Docker smoke tests.
- E2E mission tests against the sample app.

Use real Chromium for integration and E2E tests.

Mocks alone are insufficient.

## Mandatory demonstrations

Demonstrate:

1. The repository was created from scratch.
2. Docker images build.
3. Services start.
4. noVNC opens on loopback.
5. Chromium is visible.
6. A human can watch the browser.
7. The coding agent or mission runner controls the visible browser.
8. The sample app opens.
9. An app on the host opens through `host.docker.internal`.
10. A screenshot is generated.
11. A trace is generated.
12. A video is generated.
13. Console errors are captured.
14. Network failures are captured.
15. Accessibility data is captured.
16. Findings are generated.
17. A human-readable report is generated.
18. Secrets are redacted.
19. Ephemeral mode starts clean.
20. Persistent mode retains an authorized session.
21. Profiles can be reset.
22. Observer health detects an observer failure.
23. Target application failure does not mark observer health as failed.

## Agent reasoning loop

The project must enable:

```text
Agent opens target application
        ↓
Agent follows a user mission
        ↓
Agent observes rendered behavior
        ↓
Agent detects friction or failure
        ↓
Agent captures evidence
        ↓
Agent inspects code and runtime data
        ↓
Agent identifies the likely cause
        ↓
Agent applies the smallest safe fix
        ↓
Agent reruns tests
        ↓
Agent reruns the same mission
        ↓
Agent compares evidence
        ↓
Agent confirms the improvement or reverts
```

The observer does not modify target applications itself.

The coding agent may make changes only when explicitly authorized and when it has access to the target repository.

## CI mode

Prepare a headless mode that:

- Does not expose noVNC.
- Runs missions.
- Saves artifacts on failure.
- Returns non-zero status for configured critical findings.
- Uses ephemeral profiles.
- Blocks remote external targets unless explicitly allowed.

Do not let CI work delay the first local version.

## Documentation

Create:

```text
README.md
docs/architecture.md
docs/security.md
docs/missions.md
docs/agent-integration.md
docs/fedora.md
docs/troubleshooting.md
```

The Fedora guide must cover:

- Docker setup.
- SELinux volume labels.
- Port behavior.
- `host.docker.internal`.
- Firewall considerations.
- noVNC access.
- Chromium failures.
- Shared-memory problems.
- Profile permissions.

## Phased implementation

### Phase 1 — Visible browser

Deliver:

- Docker image.
- Xvfb.
- Window manager.
- Chromium.
- x11vnc.
- noVNC.
- Sample app.
- Health check.
- Screenshot proof.

Do not continue until the developer can open:

```text
http://127.0.0.1:6080
```

and see Chromium displaying the sample application.

### Phase 2 — Programmatic control

Deliver:

- Playwright control.
- Shared or equivalent visible browser control.
- Generic target URL.
- Basic CLI.
- Screenshot capture.
- Console capture.
- Network capture.

### Phase 3 — Mission runner

Deliver:

- Mission schema.
- Validation.
- Action runner.
- Structured artifacts.
- Reports.
- Sample missions.

### Phase 4 — Agent integration

Deliver:

- Agent integration documentation.
- Codex as one example.
- MCP, CDP, API, or CLI integration.
- Repeatable observation workflow.

### Phase 5 — Hardening

Deliver:

- Security review.
- Secret redaction.
- Profile lifecycle.
- Artifact retention.
- CI mode.
- Responsive missions.
- Accessibility checks.
- Improved findings.

## Development discipline

For each phase:

- Implement.
- Run tests.
- Validate Docker.
- Demonstrate real behavior.
- Record commands and outputs.
- Fix errors.
- Keep the repository working.
- Make logical commits when appropriate.

Do not declare a feature complete because files exist.

Do not invent test results.

Do not hide failures.

Do not weaken valid assertions.

Do not use evidence from a different browser session.

## Final acceptance criteria

The project is complete only when:

- It exists at `~/Projects/ui-observer`.
- It is a standalone Git repository.
- It contains no references to other projects.
- It runs through Docker Compose.
- It provides a visible Chromium session.
- The developer can watch through noVNC.
- A coding agent can control the browser.
- It works with arbitrary authorized target URLs.
- It reaches host and Docker applications.
- It records screenshots, traces, and video.
- It captures console, network, and accessibility evidence.
- It executes declarative missions.
- It produces structured findings.
- It produces readable reports.
- It supports ephemeral and persistent sessions.
- It redacts secrets.
- It contains a working generic sample app.
- It has repeatable tests.
- It documents Fedora usage.
- It demonstrates the observe → reason → fix → repeat workflow.

## Status reports

Create:

```text
.status/current.md
.status/phase-1-visible-browser.md
.status/phase-2-control.md
.status/phase-3-missions.md
.status/phase-4-agent-integration.md
.status/phase-5-hardening.md
```

The final report must include:

- Architecture.
- Versions.
- Docker services.
- Ports.
- Commands.
- Security decisions.
- Shared-browser implementation.
- Agent integration method.
- Sample missions.
- Test results.
- Artifact examples.
- Known limitations.
- Future improvements.

Begin now.

Create the repository from scratch, verify the workspace, implement Phase 1, and continue phase by phase until the standalone project is demonstrably functional.
