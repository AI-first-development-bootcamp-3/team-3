Each numbered group is one feature branch cut from `task/SCRUM-11-backend`, merged back via pull request before the next group starts. Jira subtask keys are noted per group — transition each to In Progress as you pick it up, and Done when its group's PR merges.

## 1. Feature: App skeleton — `feat/SCRUM-23-app-skeleton`

_Covers SCRUM-23, SCRUM-21, SCRUM-24, SCRUM-25. Nothing else can start until this merges._

- [x] 1.1 Cut `feat/SCRUM-23-app-skeleton` from `task/SCRUM-11-backend`
- [x] 1.2 Create `backend/` and `frontend/` sibling folders; add a root `.gitignore` covering `node_modules`, `dist`, `.env`, and coverage output
- [x] 1.3 Initialise `backend/package.json` with TypeScript, `tsconfig.json` targeting Node 24 LTS in strict mode, and `dev` / `build` / `start` scripts
- [x] 1.4 Install the **complete** dependency set for all seven features in this one commit, so later branches add only source files (see design.md → Migration Plan step 1)
- [x] 1.5 Create the folder layout under `backend/src/`: `routes/`, `controllers/`, `services/`, `middleware/`, `types/`, `config/`
- [x] 1.6 Add the environment config module — parse and validate `PORT`, `NODE_ENV`, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `LOG_LEVEL` at startup; exit non-zero listing every missing or malformed variable
- [x] 1.7 Commit `.env.example` documenting every variable by name, with no real values
- [x] 1.8 Build the Express app and server entrypoint as separate modules, so tests can import the app without binding a port
- [x] 1.9 Define the error contract: an `AppError` type carrying HTTP status, machine-readable code, message, and optional per-field details
- [x] 1.10 Add error-handling middleware returning that contract; log full detail server-side while returning a generic message for unexpected errors, never leaking stack traces, SQL, or paths
- [x] 1.11 Add a catch-all 404 handler using the same error contract
- [x] 1.12 Implement `GET /health` returning 200 with service status (database check added in group 2)
- [x] 1.13 Configure ESLint for Node + TypeScript, Prettier, and `lint` / `format` scripts, with the two configured not to fight each other
- [x] 1.14 Configure Vitest with v8 coverage, a 60% line threshold, and generated/config files excluded from the denominator
- [x] 1.15 Write tests covering the health endpoint, the 404 handler, and the error middleware's sanitisation of unexpected errors
- [x] 1.16 Verify `npm run dev`, `npm run build`, `npm run lint`, and `npm test` all succeed; open PR to `task/SCRUM-11-backend`

## 2. Feature: Data layer — `feat/SCRUM-22-data-layer`

_Covers SCRUM-22, SCRUM-44, SCRUM-51._

- [x] 2.1 Cut `feat/SCRUM-22-data-layer` from the updated `task/SCRUM-11-backend`
- [x] 2.2 Add a `docker-compose.yml` PostgreSQL 16 service with a UTF-8 database and a named volume for persistence
- [x] 2.3 Initialise Prisma; point the datasource at `DATABASE_URL` and add `prisma generate` to `postinstall`
- [x] 2.4 Model `User` in `schema.prisma` with email, hashed password, display name, an admin/employee role enum, and `isActive`
- [x] 2.5 Model `Client`, `Project` (belonging to a Client), and `Task` (belonging to a Project), each with `isActive` and foreign keys enforcing the hierarchy
- [x] 2.6 Generate and apply the initial migration; confirm an empty database reaches the current schema from migrations alone
- [x] 2.7 Create the singleton Prisma client module, guarded against connection exhaustion under hot reload
- [x] 2.8 Implement the soft-delete Client Extension: rewrite `delete` into `update { isActive: false }`, and inject `isActive: true` into reads unless a caller opts out
- [x] 2.9 Write the seed script — one admin, one employee, and clients with projects and tasks exercising the full hierarchy; include Hebrew strings to prove UTF-8 end to end
- [x] 2.10 Make the seed script repeatable (upsert on stable keys) so a second run creates no duplicates
- [x] 2.11 Extend `GET /health` to check database connectivity, returning 503 and naming the database when unreachable
- [x] 2.12 Test the soft-delete extension: deletion sets inactive without removing the row, default reads exclude inactive records, and the explicit opt-out returns them
- [x] 2.13 Document the soft-delete convention in `backend/README.md`, including how to opt out and why it exists
- [x] 2.14 Verify migrate + seed from an empty database, and that health reports the database correctly; open PR

## 3. Feature: Request pipeline — `feat/SCRUM-45-request-pipeline`

_Covers SCRUM-45, SCRUM-47, SCRUM-48._

- [x] 3.1 Cut `feat/SCRUM-45-request-pipeline` from the updated `task/SCRUM-11-backend`
- [x] 3.2 Write the Zod validation middleware — validate body, params, and query against a supplied schema, replacing the request payload with the parsed (and stripped) result
- [x] 3.3 Map Zod issues onto the error contract's `details` array so all field failures are reported in one 400 response, not just the first
- [x] 3.4 Configure pino with environment-driven log level, plus `pino-pretty` for local development only
- [x] 3.5 Add `pino-http` request logging emitting method, path, status, and duration, with a per-request correlation id
- [x] 3.6 Configure redaction so authorization headers, passwords, and tokens never reach the logs
- [ ] 3.7 Configure CORS from `CORS_ORIGIN`, supporting multiple origins and credentialed requests
- [ ] 3.8 Apply helmet, and disable the framework's identifying response header
- [ ] 3.9 Add a sample validated route demonstrating required-field, wrong-type, and multi-field failures
- [ ] 3.10 Test validation (valid passes, missing field, wrong type, three simultaneous failures, unknown fields stripped), CORS (allowed vs disallowed origin), and that security headers are present
- [ ] 3.11 Verify logs are structured JSON with no secrets present; open PR

## 4. Feature: Auth middleware — `feat/SCRUM-46-auth-middleware`

_Covers SCRUM-46. Token issuance is out of scope — it belongs to the Auth epic (SCRUM-4)._

- [ ] 4.1 Cut `feat/SCRUM-46-auth-middleware` from the updated `task/SCRUM-11-backend`
- [ ] 4.2 Define the JWT payload type (user id, role) and extend the Express request type so `req.user` is typed at every call site
- [ ] 4.3 Implement token verification middleware: extract the bearer token, verify signature and expiry against `JWT_SECRET`, attach `req.user`
- [ ] 4.4 Return 401 for missing, malformed, and wrongly signed tokens without disclosing which failed; give expiry a distinct code so clients can prompt re-authentication
- [ ] 4.5 Implement the role-guard middleware restricting routes to administrators, returning 403 for authenticated-but-unauthorised callers
- [ ] 4.6 Ensure the guard composes after verification, so an unauthenticated request to an admin route returns 401 rather than 403
- [ ] 4.7 Add a protected sample route and an admin-only sample route demonstrating both middlewares
- [ ] 4.8 Test valid token, missing token, malformed token, expired token, employee refused an admin route, admin permitted, and that a role claim in the request body cannot override the token's role
- [ ] 4.9 Open PR

## 5. Feature: Test harness — `feat/SCRUM-52-test-harness`

_Covers SCRUM-52. Requires groups 1 and 2._

- [ ] 5.1 Cut `feat/SCRUM-52-test-harness` from the updated `task/SCRUM-11-backend`
- [ ] 5.2 Add a separate test-database service to `docker-compose.yml` (or a distinct database name) driven by `DATABASE_URL` in the test environment
- [ ] 5.3 Add global test setup applying the same migrations used by every other environment to the test database
- [ ] 5.4 Implement per-test truncation so writes in one test are invisible to the next, keeping the schema intact
- [ ] 5.5 Add a guard aborting the run if the test database URL resolves to the development database
- [ ] 5.6 Add test data factories for the core entities so integration tests need no hand-written fixtures
- [ ] 5.7 Write an integration test proving Client → Project → Task traversal against real SQL
- [ ] 5.8 Confirm the full suite passes twice consecutively with no manual cleanup, and document how CI provisions the test database
- [ ] 5.9 Open PR

## 6. Feature: API documentation — `feat/SCRUM-50-api-docs`

_Covers SCRUM-50. Deferrable — see proposal.md → Deferred scope._

- [ ] 6.1 Cut `feat/SCRUM-50-api-docs` from the updated `task/SCRUM-11-backend`
- [ ] 6.2 Configure swagger-jsdoc to build the OpenAPI document from annotations beside the route definitions
- [ ] 6.3 Serve the interactive UI at `/api-docs` and the raw OpenAPI JSON at a sibling route, both disabled in production by configuration
- [ ] 6.4 Declare the bearer-token security scheme so protected endpoints become executable from the UI once login exists
- [ ] 6.5 Annotate `GET /health` fully, including its 200 and 503 responses, as the worked example later endpoints copy
- [ ] 6.6 Document the shared error contract as a reusable schema component
- [ ] 6.7 Test that the generated document is valid OpenAPI and that the UI route responds; open PR

## 7. Feature: File uploads — `feat/SCRUM-49-file-uploads`

_Covers SCRUM-49. Deferrable — nothing consumes this until the היעדרויות epic (SCRUM-7)._

- [ ] 7.1 Cut `feat/SCRUM-49-file-uploads` from the updated `task/SCRUM-11-backend`
- [ ] 7.2 Define the `FileStorage` interface (store, retrieve, delete) so the backing store can be replaced without touching callers
- [ ] 7.3 Implement local-filesystem storage against a mounted volume, generating opaque storage keys that sanitise the original filename
- [ ] 7.4 Add the `Attachment` model and migration — filename, mime type, size, storage key, uploader, uploaded-at
- [ ] 7.5 Configure multer with size and MIME-type limits, mapping rejections onto the error contract as 413 and 400
- [ ] 7.6 Add authenticated upload and retrieval endpoints; enforce that employees reach only their own attachments while administrators reach any
- [ ] 7.7 Stream retrieval rather than buffering, returning the recorded content type and 404 for unknown identifiers
- [ ] 7.8 Test oversized rejection, disallowed type rejection, unauthenticated rejection, owner access, admin access, cross-employee refusal, and that a traversal-laden filename cannot escape the store
- [ ] 7.9 Record the storage decision and the S3 migration path in `backend/README.md`, noting that free-tier filesystems are ephemeral
- [ ] 7.10 Open PR

## 8. Close out SCRUM-11

- [ ] 8.1 Merge `development` into `task/SCRUM-11-backend` and resolve any drift accumulated during the story
- [ ] 8.2 Confirm the full suite passes with coverage at or above 60%
- [ ] 8.3 Verify a clean-clone bootstrap: `npm install`, compose up, migrate, seed, `npm run dev`, and `/health` green
- [ ] 8.4 Write `backend/README.md` covering setup, scripts, environment variables, and the conventions later epics must follow
- [ ] 8.5 Open the PR from `task/SCRUM-11-backend` to `epic-setup&instrafracture`
- [ ] 8.6 Transition remaining SCRUM-11 subtasks to Done and run `/opsx:archive` for this change
