## Why
SCRUM-26 (frontend Dockerfile), SCRUM-27 (backend Dockerfile), and SCRUM-28 (Postgres Compose service) each produced one piece in isolation, on separate branches. SCRUM-29 wires them into a single `docker-compose.yml` so the whole stack (frontend, backend, db) can be brought up together for local development. This branch already carries SCRUM-28's `postgres` service (it was cut from `subtask/scrum-28-PostgreSQL-service`); the `frontend/` and `backend/` Dockerfiles from SCRUM-26/27 aren't present here yet and will need merging in before the compose file can actually build.

## What Changes
- **Extend `docker-compose.yml`** to add `backend` and `frontend` services alongside the existing `postgres` service _(SCRUM-29)_
- `backend` builds from `./backend`'s `dev` target (hot reload via `tsx watch`), waits for `postgres` to be healthy, connects via the internal `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/abra_dev`
- `frontend` builds from `./frontend`'s `dev` target (Vite dev server), points at the backend via a **host-reachable** `VITE_API_URL=http://localhost:3000` — the browser makes the API calls, not the frontend container, so this must be the published host port, not the internal service name
- Explicit `app-network` bridge network shared by all three services
- `backend`'s `CORS_ORIGIN` set to the frontend's published origin (`http://localhost:5173`) so the browser is allowed to call the API

### Non-goals
- Production-target wiring — this compose file uses `dev` targets only, for local development (matches SCRUM-30's "local Docker run" framing); production targets remain available via `--target production` outside this file
- Real secrets management — `JWT_SECRET` etc. are dev-only placeholder values here, not suitable for any shared environment
- CI/CD integration (SCRUM-35, separate)

## Capabilities

### New Capabilities
- `full-stack-compose`: wires frontend, backend, and Postgres together for local development — service dependencies, shared network, and cross-service URL contracts

### Modified Capabilities
- `database-containerization` (from SCRUM-28): now consumed by the `backend` service rather than standalone

## Impact
**Created:** extended `docker-compose.yml` (adds `backend` + `frontend` services and `app-network`)
**Depends on:** `frontend/Dockerfile` (SCRUM-26), `backend/Dockerfile` (SCRUM-27) — **not present on this branch yet**; needs a merge before build-verification is possible
**Downstream:** SCRUM-30 documents running this stack
**Constraints carried from Jira:** acceptance criteria — compose file has frontend/backend/db services; shared network between services; backend connects via `DATABASE_URL`; frontend points at backend API URL
