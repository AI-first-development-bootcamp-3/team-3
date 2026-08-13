## Context
- This branch was cut from `main` (README only) — it doesn't have `docker-compose.yml`, the Dockerfiles, or any prior Docker subtask's work
- SCRUM-29's `docker-compose.yml` (as committed on `subtask/SCRUM-29-docker-compose-full-stack`) hardcodes: `POSTGRES_USER`/`PASSWORD`/`DB` = `postgres`/`postgres`/`abra_dev`, ports `5432`/`3000`/`5173`, backend `DATABASE_URL`/`CORS_ORIGIN`/`JWT_SECRET`/`LOG_LEVEL`, frontend `VITE_API_URL=http://localhost:3000`
- Jira explicitly scopes this subtask narrowly: short notes only — the full README belongs to a separate Documentation epic

## Goals / Non-Goals
**Goals:**
- `.env.example` accurately documents every var the stack needs, with values that reproduce SCRUM-29's current working defaults
- Short, focused run docs — not a general project README

**Non-Goals:**
- Editing `docker-compose.yml` on this branch (not present here)
- Comprehensive project documentation

## Decisions
### Values in `.env.example` mirror SCRUM-29's current hardcoded compose values exactly
Ensures `cp .env.example .env` reproduces the same working defaults already used in SCRUM-29, rather than inventing different placeholder values that would silently diverge once branches merge.
*Alternatives:* **Generic placeholder values** (e.g. `changeme`) — rejected: less immediately useful, and risks mismatch with what Compose currently expects until Compose itself is refactored to use substitution.

### Defer wiring `docker-compose.yml` to actually read from `.env`
Not possible on this branch — there's no `docker-compose.yml` here yet, and forcing it would require merging SCRUM-29 first. Documenting the target `.env.example` now still satisfies the acceptance criterion (the file exists and is accurate); the Compose-file substitution edit becomes a small, mechanical follow-up once branches converge.
*Alternatives:* **Merge SCRUM-29 into this branch first, then edit `docker-compose.yml` directly** — more "complete" immediately, but reintroduces the multi-branch merge risk that's been deliberately deferred across SCRUM-26/27/28/29 so far.

## Risks / Trade-offs
**`.env.example` could drift from `docker-compose.yml` if the latter changes independently before merge.** Both were authored with the same values, so they match today. Mitigation: when merging, treat reconciling `docker-compose.yml` to read from `.env` (via substitution) as part of the merge step, not an afterthought.

**A `JWT_SECRET` placeholder is committed in a shared `.env.example`.** Standard practice — `.env.example` values are meant to be overridden per developer — but worth being explicit that it's a dev placeholder, not a real secret.

## Migration Plan
1. Add `.env.example` and `DOCKER.md` on this branch
2. When merging with SCRUM-29: update `docker-compose.yml` to use `${VAR:-default}` substitution for each hardcoded value, matching `.env.example`
3. Verify `cp .env.example .env && docker compose up --build` brings up the full stack

## Open Questions
None blocking — the deferred substitution work is explicitly scheduled as a merge-time step rather than left ambiguous.
