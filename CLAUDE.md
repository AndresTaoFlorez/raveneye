# CLAUDE.md

Read **AGENTS.md** in this directory — it is the complete operating manual for AI agents
using this repository, including you. It covers the browser-control surfaces (CDP, MCP,
HTTP API, CLI, missions), the JSON shapes, exit codes, hard rules, and the observe →
fix → verify workflow.

Quick orientation:

- This project IS the tool: a shared visible Chromium (human watches `127.0.0.1:6080`,
  agents control via CDP `127.0.0.1:9222`).
- Health first: `curl http://127.0.0.1:8090/health`; stack up/down via `make up` / `make down`.
- Full test suite (`npm test`) needs the stack running; `npm run test:unit` does not.
- Human documentation: `docs-vault/Index.md` (Obsidian vault) and `docs/`.
