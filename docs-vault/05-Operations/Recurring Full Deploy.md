---
tags: [operations, release]
---

# Recurring Full Deploy

Every push to `main` must run the complete publish pipeline. A local rebuild or a manual hot-copy into a running container is not a deploy.

## Source of truth

The recurrent deploy is `.github/workflows/publish.yml`.

Triggers:

- `push` to `main` runs the full recurring deploy.
- `push` of `v*` tags keeps the explicit release path for semver Docker tags and npm version checks.

## What Gets Published

Docker Hub:

- Builds `apps/observer-server/Dockerfile`.
- Pushes `andrestao577/raveneye:latest` from `main`.
- Pushes immutable `sha-<commit>` tags for traceability.
- Pushes semver tags when the workflow runs from `v*` tags.

npmjs:

- Builds the workspace with `npm run build`.
- Publishes `raveneye-mcp-server` from `apps/mcp-server`.
- Publishes only when `apps/mcp-server/package.json` contains a version that does not already exist on npm.

The npm skip is intentional. npm package versions are immutable; a repeated push to `main` cannot republish `0.1.10` after that version already exists. For an npm release, bump `apps/mcp-server/package.json` before merging or pushing to `main`.

## Required Secrets

The repository must have these GitHub Actions secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `NPM_TOKEN`

If any secret is missing or expired, the deploy is failed, not complete.

## Required Gates

The workflow must:

- Run `scripts/deploy-preflight.mjs` before any publish job.
- Check out the exact commit that reached `main`.
- Authenticate to Docker Hub before pushing images.
- Set up Docker Buildx.
- Build and push the Docker image.
- Set up Node 22 against the npm registry.
- Run `npm ci`.
- Run `npm run build`.
- For `v*` tags, verify the tag version matches `apps/mcp-server/package.json`.
- Publish the npm package only when the version is new.

## Definition of Done

A `main` push is fully deployed only when:

- The GitHub Actions `Publish` workflow succeeds for that commit.
- Docker Hub contains `andrestao577/raveneye:latest` for that commit.
- Docker Hub contains the matching `sha-<commit>` tag.
- npm either contains the newly published `raveneye-mcp-server` version or the workflow explicitly skipped because that exact version already existed.

## Operator Rules

- Do not call a local `docker compose up --build` a full deploy.
- Do not call `git push` alone a full deploy.
- Do not hot-copy `apps/dashboard/dist` into a container as a release method.
- If a user asks for "full deploy", verify the GitHub Actions publish run and report Docker Hub/npm outcomes separately.
- If npm was skipped because the version already existed, say that clearly and state which version was checked.

Related: [Commands Reference](./Commands%20Reference.md) · [Testing](./Testing.md)
