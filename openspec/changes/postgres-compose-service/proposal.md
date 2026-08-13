## Why
`backend-foundation` (SCRUM-11) and `feat/SCRUM-22-data-layer` already introduced a `docker-compose.yml` with a working `postgres` service, since the backend needs a real Postgres instance to develop against locally (Prisma's `DATABASE_URL` points at it). SCRUM-28 formalizes this piece as its own Jira-tracked subtask under the Docker epic. This branch (`Subtask/scrum-28-PostgreSQL-service`) branched from `main` (README only), not from `task/SCRUM-11-backend` or `feat/SCRUM-22-data-layer`, so it currently has no `docker-compose.yml`. Rather than inventing a new definition, this change reuses the already-validated `postgres` service from `feat/SCRUM-22-data-layer` verbatim, so the eventual full-stack compose file (SCRUM-29) doesn't have two divergent Postgres configs to reconcile.

## What Changes
- **Add root `docker-compose.yml`** containing only the `postgres` service, sourced verbatim from `origin/feat/SCRUM-22-data-layer` _(SCRUM-28)_
- Named volume `postgres-data` for persistence across container restarts
- Healthcheck (`pg_isready`) included, matching upstream — not explicitly required by Jira's acceptance criteria, but part of the definition being reused, and SCRUM-29 will want `depends_on: condition: service_healthy` for the backend

### Non-goals
- No backend/frontend services wired in yet — that's SCRUM-29
- No env var externalization via a compose `.env` file — credentials stay inline, matching the reused definition
- Does not resolve the branch-ancestry mismatch between this subtask branch and `task/SCRUM-11-backend`/`feat/SCRUM-22-data-layer` — that's a merge concern, not this change's scope

## Capabilities

### New Capabilities
- `database-containerization`: defines the Postgres Compose service used for local development — image, persistence, credentials, and exposed port

### Modified Capabilities
None

## Impact
**Created:** `docker-compose.yml` (postgres service only)
**Reused verbatim from:** `origin/feat/SCRUM-22-data-layer:docker-compose.yml`
**Consistency requirement:** `backend/.env.example`'s `DATABASE_URL` (`postgresql://postgres:postgres@localhost:5432/abra_dev`) must keep matching these credentials/port/db name
**Downstream:** SCRUM-29 (full-stack compose) adds `backend`/`frontend` services alongside this one
**Constraints carried from Jira:** acceptance criteria — official Postgres image configured; persistent volume for data; env vars set (`POSTGRES_USER`/`PASSWORD`/`DB`); port exposed for local access
