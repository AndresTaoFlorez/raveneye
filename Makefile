SHELL := /bin/bash
COMPOSE := docker compose
NOVNC_PORT ?= $(shell grep -E '^UI_OBSERVER_NOVNC_PORT=' .env 2>/dev/null | cut -d= -f2)
NOVNC_PORT := $(if $(NOVNC_PORT),$(NOVNC_PORT),6080)

.PHONY: build up down restart logs open health reset-profile smoke mission artifacts trace cleanup test lint format verify

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d
	@echo "noVNC: http://127.0.0.1:$(NOVNC_PORT)"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f --tail=200

open:
	@echo "Watch the shared browser at: http://127.0.0.1:$(NOVNC_PORT)"

health:
	@curl -fsS http://127.0.0.1:$${UI_OBSERVER_API_PORT:-8090}/health | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.stringify(JSON.parse(d),null,2)))'

reset-profile:
	./scripts/reset-profile.sh

smoke:
	./scripts/run-mission.sh generic-smoke

mission:
	@test -n "$(MISSION)" || (echo "usage: make mission MISSION=<name>"; exit 2)
	./scripts/run-mission.sh $(MISSION)

artifacts:
	@ls -1t artifacts/runs 2>/dev/null | head -20 || echo "no runs yet"

trace:
	@test -n "$(RUN_ID)" || (echo "usage: make trace RUN_ID=<run-id>"; exit 2)
	npx playwright show-trace artifacts/runs/$(RUN_ID)/trace.zip

cleanup:
	./scripts/cleanup-artifacts.sh

test:
	npm test

lint:
	npm run lint

format:
	npm run format

verify:
	./scripts/verify-workspace.sh
