---
tags: [moc]
---

# RavenEye — Documentation Vault

**RavenEye** lets a coding agent and a human developer watch and control real local Chromium sessions — from the historical base shared browser to isolated app workspaces. Start with [What is RavenEye](./01-Overview/What%20is%20RavenEye.md) if you are new, or [Quick Start](./05-Operations/Quick%20Start.md) if you want it running in two minutes.

## 🧭 Overview
- [What is RavenEye](./01-Overview/What%20is%20RavenEye.md) — purpose and the problems it catches
- [Absolute Basics](./01-Overview/Absolute%20Basics.md) — Docker, ports, localhost explained with zero assumptions
- [Shared Browser Model](./01-Overview/Shared%20Browser%20Model.md) — the core concept: one browser, two controllers
- [Project History](./01-Overview/Project%20History.md) — the five implementation phases and their evidence
- [Glossary](./01-Overview/Glossary.md) — every term in one place

## 🏗 Architecture
- [Architecture Overview](./02-Architecture/Architecture%20Overview.md) — the big picture and data flow
- [Observer Server](./02-Architecture/Observer%20Server.md) — the Node process that owns the shared browser
- [Display Stack](./02-Architecture/Display%20Stack.md) — Xvfb, Openbox, x11vnc, noVNC
- [CDP Endpoint](./02-Architecture/CDP%20Endpoint.md) — how agents attach to the visible browser
- [Control API](./02-Architecture/Control%20API.md) — the HTTP surface on port 8090
- [Local Dashboard](./02-Architecture/Local%20Dashboard.md) — React UI for status, registered apps, and recent runs
- [Application Registry](./02-Architecture/Application%20Registry.md) — local SQLite registry for observed apps
- [Session Model](./02-Architecture/Session%20Model.md) — base vs dynamic observed sessions
- [Multi Observer](./02-Architecture/Multi%20Observer.md) — isolated app workspaces and backend-owned watch/CDP URLs
- [Health Model](./02-Architecture/Health%20Model.md) — component health vs target health vs mission results
- [Docker Design](./02-Architecture/Docker%20Design.md) — images, ports, volumes, limits
- [Sample App](./02-Architecture/Sample%20App.md) — the built-in validation application

## 🎯 Missions
- [Mission Runner](./03-Missions/Mission%20Runner.md) — the evaluation engine
- [Mission Format](./03-Missions/Mission%20Format.md) — the declarative YAML schema
- [Actions Reference](./03-Missions/Actions%20Reference.md) — all 22 supported actions
- [Checks Reference](./03-Missions/Checks%20Reference.md) — checks and their severities
- [Findings](./03-Missions/Findings.md) — the structured problem records
- [Artifacts](./03-Missions/Artifacts.md) — what every run leaves on disk
- [Sample Missions](./03-Missions/Sample%20Missions.md) — generic-smoke, error-hunt, responsive-sweep

## 🤖 Agents
- [Agent Integration](./04-Agents/Agent%20Integration.md) — the five integration surfaces
- [Instructions for AI Agents](./04-Agents/Instructions%20for%20AI%20Agents.md) — the machine-facing manual (AGENTS.md)
- [Playwright over CDP](./04-Agents/Playwright%20over%20CDP.md) — full-control scripting
- [Playwright MCP](./04-Agents/Playwright%20MCP.md) — for MCP-capable agents (Claude Code, Codex)
- [Observer CLI](./04-Agents/Observer%20CLI.md) — shell-friendly control
- [Reasoning Loop](./04-Agents/Reasoning%20Loop.md) — observe → fix → verify, demonstrated

## ⚙️ Operations
- [Quick Start](./05-Operations/Quick%20Start.md) — from clone to visible browser
- [Observing Your Own App](./05-Operations/Observing%20Your%20Own%20App.md) — point the observer at your real project (the Zoom-call recipe)
- [Commands Reference](./05-Operations/Commands%20Reference.md) — every make target and script
- [Recurring Full Deploy](./05-Operations/Recurring%20Full%20Deploy.md) — automatic Docker Hub and npm publish plan for every `main` push
- [Configuration](./05-Operations/Configuration.md) — all environment variables
- [Profiles](./05-Operations/Profiles.md) — ephemeral vs persistent sessions
- [CI Mode](./05-Operations/CI%20Mode.md) — headless missions without exposed ports
- [Testing](./05-Operations/Testing.md) — unit, integration, and real-Chromium validation
- [Fedora Notes](./05-Operations/Fedora%20Notes.md) — SELinux, firewall, host gateway
- [Troubleshooting](./05-Operations/Troubleshooting.md) — symptom → fix

## 🔒 Security
- [Security Model](./06-Security/Security%20Model.md) — the overall posture
- [URL Policy](./06-Security/URL%20Policy.md) — scheme and host allow-listing
- [Secret Redaction](./06-Security/Secret%20Redaction.md) — how credentials stay out of evidence
