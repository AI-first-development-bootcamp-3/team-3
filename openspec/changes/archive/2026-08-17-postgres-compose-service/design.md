## Context
- A `docker-compose.yml` with a `postgres` service already exists on two upstream branches (`task/SCRUM-11-backend`, refined on `feat/SCRUM-22-data-layer`) — this subtask's branch (`Subtask/scrum-28-PostgreSQL-service`) branched from `main` and doesn't have it
- Backend's Prisma datasource reads `DATABASE_URL` from env (via `backend/prisma.config.ts`), with `backend/.env.example` defaulting to `postgresql://postgres:postgres@localhost:5432/abra_dev` — this value's user/password/db/port must match whatever the compose service defines
- `feat/SCRUM-22-data-layer`'s definition switched from `postgres:16` to `postgres:16-alpine` + `C.UTF-8` locale (vs `en_US.UTF-8` on SCRUM-11) specifically because Alpine's musl libc doesn't ship the `en_US.UTF-8` locale — this is a fix, not arbitrary drift, so the alpine + `C.UTF-8` combination is treated as the corrected, current version

## Goals / Non-Goals
**Goals:**
- Postgres service definition byte-for-byte consistent with what `feat/SCRUM-22-data-layer`'s backend already expects, so no reconciliation is needed when branches eventually merge
- Meets all four Jira acceptance criteria explicitly

**Non-Goals:**
- Wiring backend/frontend into the same compose file (SCRUM-29)
- Changing credentials/db name from the established `postgres` / `postgres` / `abra_dev` defaults

## Decisions
### Reuse the `feat/SCRUM-22-data-layer` `postgres` service definition verbatim rather than authoring a new one
Two upstream branches already have a working, tested Postgres service that the backend's Prisma layer is built against. Writing an independent definition on this branch risks drifting on image tag, locale args, or credentials — any mismatch would silently break `DATABASE_URL` once branches merge. Copying it verbatim keeps the eventual merge trivial (identical file content, no conflict).
*Alternatives:* **Author a fresh minimal service (just the 4 required acceptance-criteria fields, no healthcheck/restart policy)** — rejected: would technically satisfy Jira's checklist but diverge from the version the backend already depends on, recreating the double-source-of-truth problem this change exists to avoid.

## Risks / Trade-offs
**Credentials are inline in `docker-compose.yml`, not in a `.env` file.** Fine for local dev (matches upstream precedent), but not something to carry into any shared/staging environment. Mitigation: out of scope for SCRUM-28; flagged for SCRUM-30 (env + docs subtask) or a future hardening pass.

**This branch's Postgres service will need reconciling with `task/SCRUM-11-backend`'s copy when branches converge.** Mitigation: verbatim reuse (above) means the merge is a no-op rather than a conflict.

## Migration Plan
1. Add root `docker-compose.yml` with just the `postgres` service on `Subtask/scrum-28-PostgreSQL-service`
2. Verify `docker compose up postgres` starts and the `pg_isready` healthcheck passes
3. Hand off to SCRUM-29 to add `backend`/`frontend` services alongside it

## Open Questions
- **Should this subtask branch instead be rebased onto `feat/SCRUM-22-data-layer`** so the file is inherited rather than duplicated? Same category of open question as SCRUM-26/27 (branch ancestry vs. spec-only delivery) — unresolved for now.
