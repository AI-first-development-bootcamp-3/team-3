## Context
- Backend `dev` target: `tsx watch src/server.ts`, port 3000, reads `NODE_ENV`/`PORT`/`DATABASE_URL`/`CORS_ORIGIN`/`JWT_SECRET`/`LOG_LEVEL` at runtime (zod-validated, process exits if any are missing)
- Frontend `dev` target: `vite --host`, port 5173 — `VITE_API_URL` is read by the Vite dev server at each `vite` invocation, unlike a production build where it's baked into a static bundle, so it *can* be supplied as a normal runtime env var here
- **Critical nuance**: frontend code executes in the user's browser, not inside the frontend container, so any URL the frontend uses to reach the backend must be resolvable from the host/browser (`localhost:3000`), not the Docker-internal service name (`backend`), which only other containers can resolve
- Postgres service (SCRUM-28) is already published on port 5432 with `postgres`/`postgres`/`abra_dev` credentials matching the backend's `DATABASE_URL` expectation

## Goals / Non-Goals
**Goals:**
- Single `docker compose up` brings up frontend, backend, and db together for local development
- Backend reaches Postgres over the internal Docker network; frontend (browser) reaches backend over the published host port
- All four Jira acceptance criteria satisfied explicitly

**Non-Goals:**
- Production-target orchestration
- Secrets hygiene beyond "clearly a dev placeholder"

## Decisions
### Use `dev` targets for both frontend and backend in this compose file, not `production`
This `docker-compose.yml` is for local development (SCRUM-30 documents "local Docker run"); the frontend and backend Dockerfiles both provide `dev` targets specifically so hot reload works during compose-based development. Production targets remain available via `--target production` for other purposes (e.g. a future deploy pipeline) but aren't wired into this file.
*Alternatives:* **production targets** — rejected for this compose file since it would require rebuilding the image on every code change, defeating the point of local dev via compose.

### `VITE_API_URL` points at `localhost:3000`, not the internal `backend` service name
Because frontend JS runs in the browser (outside the Docker network), only host-published addresses are reachable from it. Using the internal service name would resolve for other *containers* but fail entirely from the browser.
*Alternatives:* none reasonable — this is a hard constraint of how Vite/browser apps behave in a containerized dev setup, not a stylistic preference.

### Explicit named `app-network` rather than relying on Compose's implicit default network
Acceptance criteria explicitly calls for "shared network between services." Compose creates a default network automatically, but naming it explicitly documents the intent directly in the file.

## Risks / Trade-offs
**`frontend/` and `backend/` application source isn't present on this branch.** Only the Dockerfiles (SCRUM-26/27, copied verbatim) are here — `build: context: ./frontend` / `./backend` directives resolve to real Dockerfiles, but `docker compose build` will still fail until real application source is added underneath them. This is intentional: the user is deliberately staging infrastructure ahead of source integration, to be merged/added later on their own timeline. Mitigation: none needed — this is the desired state, not a gap to close within this change.

**Dev secrets in plain text in the compose file.** `JWT_SECRET` etc. are placeholder dev-only values. Mitigation: SCRUM-30 should call out explicitly that this isn't safe beyond local dev.

## Migration Plan
1. Add `backend` and `frontend` services plus `app-network` to `docker-compose.yml`
2. Add the Dockerfiles/`.dockerignore`/`nginx.conf` (SCRUM-26/27, infra only) so build contexts resolve
3. Application source (`frontend/`, `backend/`) added/integrated later, on the user's own timeline
4. Once source is in place, verify `docker compose up` brings up all three services successfully, backend connects to Postgres, frontend can call the backend from the browser
5. Hand off to SCRUM-30 for docs

## Open Questions
None currently — the branch-ancestry question from SCRUM-26/27/28 is resolved for this change: infrastructure is staged now, application source is deliberately deferred to a later, separate integration step.
