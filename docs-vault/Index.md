---
tags: [moc]
---

# UI Observer — Documentation Vault

**UI Observer** lets a coding agent and a human developer watch and control the **same real Chromium session** — like a screen-share with a browser. Start with [[What is UI Observer]] if you are new, or [[Quick Start]] if you want it running in two minutes.

## 🧭 Overview
- [[What is UI Observer]] — purpose and the problems it catches
- [[Shared Browser Model]] — the core concept: one browser, two controllers
- [[Project History]] — the five implementation phases and their evidence
- [[Glossary]] — every term in one place

## 🏗 Architecture
- [[Architecture Overview]] — the big picture and data flow
- [[Observer Server]] — the Node process that owns the shared browser
- [[Display Stack]] — Xvfb, Openbox, x11vnc, noVNC
- [[CDP Endpoint]] — how agents attach to the visible browser
- [[Control API]] — the HTTP surface on port 8090
- [[Health Model]] — component health vs target health vs mission results
- [[Docker Design]] — images, ports, volumes, limits
- [[Sample App]] — the built-in validation application

## 🎯 Missions
- [[Mission Runner]] — the evaluation engine
- [[Mission Format]] — the declarative YAML schema
- [[Actions Reference]] — all 22 supported actions
- [[Checks Reference]] — checks and their severities
- [[Findings]] — the structured problem records
- [[Artifacts]] — what every run leaves on disk
- [[Sample Missions]] — generic-smoke, error-hunt, responsive-sweep

## 🤖 Agents
- [[Agent Integration]] — the five integration surfaces
- [[Playwright over CDP]] — full-control scripting
- [[Playwright MCP]] — for MCP-capable agents (Claude Code, Codex)
- [[Observer CLI]] — shell-friendly control
- [[Reasoning Loop]] — observe → fix → verify, demonstrated

## ⚙️ Operations
- [[Quick Start]] — from clone to visible browser
- [[Observing Your Own App]] — point the observer at your real project (the Zoom-call recipe)
- [[Commands Reference]] — every make target and script
- [[Configuration]] — all environment variables
- [[Profiles]] — ephemeral vs persistent sessions
- [[CI Mode]] — headless missions without exposed ports
- [[Testing]] — the 37-test suite on real Chromium
- [[Fedora Notes]] — SELinux, firewall, host gateway
- [[Troubleshooting]] — symptom → fix

## 🔒 Security
- [[Security Model]] — the overall posture
- [[URL Policy]] — scheme and host allow-listing
- [[Secret Redaction]] — how credentials stay out of evidence
