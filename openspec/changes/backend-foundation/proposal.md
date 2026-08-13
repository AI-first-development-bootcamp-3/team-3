## Why

The repository is empty, so no feature epic can begin. The Auth (SCRUM-4), Admin (SCRUM-5), דיווח שעות (SCRUM-6), היעדרויות (SCRUM-7), and פיצ׳רים מתקדמים (SCRUM-8) epics all depend on a running API with a database, a request pipeline, and an auth boundary that does not exist yet.

This change delivers the backend foundation (Jira task SCRUM-11, 14 subtasks) — an API with no business endpoints, but with every cross-cutting concern in place so feature work can start immediately and consistently.

## What Changes

- **Monorepo layout** — `backend/` and `frontend/` as sibling folders in this repo, so one `docker-compose.yml` can orchestrate backend + frontend + PostgreSQL (SCRUM-3 requires "Dockerize front+back")
- **Node.js + TypeScript + Express service** with `dev` / `build` / `start` scripts, layered folders (routes, controllers, services, middleware, types), and a `GET /health` endpoint _(SCRUM-23, SCRUM-21)_
- **Consistent JSON error contract** emitted by shared error middleware, so every future endpoint fails the same way _(SCRUM-21)_
- **PostgreSQL via Prisma** — env-driven config, connection module, migrations creating the four core tables (Users, Clients, Projects, Tasks), and a seed script covering cascading Client → Project → Task lookups _(SCRUM-22, SCRUM-44)_
- **Soft-delete convention** — a shared Prisma Client Extension filtering inactive rows by default, so "delete" endpoints deactivate rather than remove _(SCRUM-51)_
- **Request pipeline** — Zod validation middleware, pino structured request logging, CORS restricted to the frontend origin, and helmet security headers _(SCRUM-45, SCRUM-47, SCRUM-48)_
- **Auth middleware** — JWT verification attaching `req.user`, plus an admin/user role guard. Login and registration are explicitly **out of scope**; they belong to the Auth epic (SCRUM-4) _(SCRUM-46)_
- **Test infrastructure** — Vitest with a passing sample test, plus an isolated test database with per-run reset so integration tests can hit real SQL _(SCRUM-25, SCRUM-52)_
- **Swagger docs** served at `/api-docs`, wired early so docs grow per-endpoint instead of being reconstructed at the end _(SCRUM-50)_
- **File upload handling** for absence attachments — metadata in PostgreSQL, bytes behind a swappable storage interface _(SCRUM-49, deferred — see Deferred Scope)_

### Non-goals

- No business endpoints. No login, no users/clients/projects CRUD, no time reports, no absences.
- No frontend code. The `frontend/` folder is created by its own task.
- No Dockerfile or CI/CD pipeline — separate Jira tasks (SCRUM-27, SCRUM-35) under the same epic.

### Deferred scope

`SCRUM-49` (file upload) and `SCRUM-50` (Swagger) ship last and may slip to their consuming epics. Nothing uploads a file until היעדרויות (SCRUM-7) starts, and Swagger has only `/health` to document until feature endpoints exist. They are specified here so the decisions are recorded, but they do not block the other five features.

## Capabilities

### New Capabilities

- `backend/api-skeleton`: HTTP service bootstrap — server lifecycle, layered folder structure, health check, and the consistent JSON error contract every endpoint inherits
- `backend/data-layer`: PostgreSQL persistence — environment-driven connection config, schema migrations for the four core entities, dev seed data, and the soft-delete convention
- `backend/request-pipeline`: Cross-cutting middleware applied to incoming requests — schema validation, structured request logging, CORS, and security headers
- `backend/auth-middleware`: The authorization boundary — JWT verification and role-based route guards that feature routes compose (token *issuance* belongs to SCRUM-4)
- `backend/test-infrastructure`: Test execution environment — unit test runner, coverage reporting against the 60% requirement, and an isolated test database with per-run state reset
- `backend/api-documentation`: Machine-readable OpenAPI documentation served from the running service
- `backend/file-storage`: Upload, storage, and retrieval of absence attachments, with file bytes held outside the database

### Modified Capabilities

None — this is the first change in the repository; `openspec/specs/` is empty.

## Impact

**Created:** `backend/` (Node.js + TypeScript + Express app), `backend/prisma/` (schema, migrations, seed), `backend/src/{routes,controllers,services,middleware,types,config}`, `backend/tests/`

**Dependencies introduced:** `express`, `@prisma/client` + `prisma`, `zod`, `pino` + `pino-http`, `cors`, `helmet`, `jsonwebtoken`, `multer`, `swagger-jsdoc` + `swagger-ui-express`, `vitest`, `supertest`, `eslint`, `prettier`, `typescript`, `tsx`

**External systems:** PostgreSQL 16 (dev + test databases). No cloud services — file bytes go to a local volume behind an interface that an S3-compatible backend can implement later.

**Downstream:** Unblocks all five feature epics. The error contract, validation middleware, soft-delete extension, and role guard become project-wide conventions that later changes are expected to follow rather than reinvent.

**Constraints carried from Jira:** 60% test coverage minimum (SCRUM-52); Swagger documentation is required, not optional (SCRUM-50, SCRUM-9); admin actions need a traceable audit trail (SCRUM-47).

**Open question:** Jira tickets reference a project spec document not available to this plan. The constraints extracted from ticket descriptions are listed above; if that document adds requirements, this proposal may need revision.
