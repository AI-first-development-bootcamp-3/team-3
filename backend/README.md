# Backend

Express + TypeScript + Prisma/PostgreSQL API for the Abra timesheet system.

## Setup

Prerequisites: Node 24+, Docker (for PostgreSQL).

```bash
cp .env.example .env        # fill in JWT_SECRET at minimum — see below
docker compose up -d postgres
cd backend
npm install                 # postinstall runs `prisma generate`
npx prisma migrate deploy   # or `prisma migrate dev` when changing the schema
npm run seed                # 7 demo users (admin@abra.test / employee@abra.test / gal@abra.test / …) + NVIDIA/Intel/AMD/HP/Amazon catalog, password `password123`
npm run dev
curl http://localhost:3000/health   # -> {"status":"ok"}
```

`/api-docs` (Swagger UI) and `/api-docs.json` are live in development —
see [API documentation](#api-documentation) below.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the server with hot reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run the compiled output |
| `npm run seed` | Populate the database via `prisma/seed.ts` (repeatable — upserts on stable keys) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm test` / `test:watch` | Vitest — see [Test database](#test-database) |
| `npm run test:coverage` | Vitest with the 60% line-coverage gate enforced |

## Environment variables

All parsed and validated at startup by `src/config/env.ts` — a missing or
malformed value exits the process with every problem listed, not just the
first. See `.env.example` for the full annotated list; `DATABASE_URL`,
`CORS_ORIGIN`, and `JWT_SECRET` are required, everything else defaults.

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | no (`development`) | `development` \| `test` \| `production` |
| `PORT` | no (`3000`) | |
| `DATABASE_URL` | **yes** | Prisma-format PostgreSQL connection string |
| `CORS_ORIGIN` | **yes** | Comma-separated list of allowed browser origins |
| `JWT_SECRET` | **yes** | HS256 signing key, 32+ characters (`openssl rand -base64 32`) |
| `LOG_LEVEL` | no (`info`) | pino level; `silent` disables logging (used in tests) |
| `STORAGE_DIR` | no (`./storage/uploads`) | See [File storage](#file-storage) |
| `RATE_LIMIT_EMAIL_MAX_ATTEMPTS` | no (`5`) | See [Login rate limiting](#login-rate-limiting) |
| `RATE_LIMIT_IP_MAX_ATTEMPTS` | no (`50`) | See [Login rate limiting](#login-rate-limiting) |
| `RATE_LIMIT_WINDOW_SECONDS` | no (`900`) | See [Login rate limiting](#login-rate-limiting) |
| `RATE_LIMIT_WRITE_MAX_REQUESTS` | no (`60`) | See [Write rate limiting](#write-rate-limiting) |
| `TRUST_PROXY` | no (`false`) | See [Login rate limiting](#login-rate-limiting) |

## Conventions later epics should follow

- **Layered structure:** `routes/` declare paths and compose middleware,
  `controllers/` translate HTTP to/from domain calls, `services/` hold
  business logic and own all database access. Keeps services unit-testable
  without HTTP and gives every feature an obvious place to put things.
- **Error contract:** throw `AppError` (`src/types/errors.ts`) from anywhere
  — a route, a service, middleware — and the error middleware
  (`src/middleware/error.middleware.ts`) serialises it identically
  everywhere: `{ error: { code, message, details? } }`. Unexpected errors
  are logged in full server-side and returned to the client as a generic
  500, never leaking stack traces or internals.
- **Validation:** wrap a route with `validate({ body, params, query })`
  (`src/middleware/validate.middleware.ts`) using Zod schemas from
  `src/types/`. All field failures come back in one 400, and the request
  object is replaced with the parsed, stripped result — downstream code
  only ever sees trusted, typed data.
- **Auth:** `authenticate` (`src/middleware/auth.middleware.ts`) reads the
  session from an httpOnly `abra_session` cookie (browser) or a `Bearer`
  token (tests/Swagger), then attaches `req.user`. `POST /login` never
  returns the JWT in JSON. `requireRole(role)` composes after authenticate
  to restrict a route by role. An unauthenticated request to a role-guarded
  route gets 401, never 403. `GET /me` is the session ping used to kick a
  deactivated account immediately.
- **Soft delete**, **test database**, and **file storage** each have their
  own section below — read them before touching `User`/`Client`/`Project`/
  `Task`, writing an integration test, or adding a new attachment-like
  feature.
- **API documentation:** annotate new routes with `@openapi` JSDoc beside
  the route definition (see `src/routes/health.routes.ts` for the worked
  example) — the OpenAPI document at `/api-docs.json` is generated from
  these, not maintained separately.

## Soft delete

`User`, `Client`, `Project`, and `Task` are never hard-deleted — historical
time reports and audit trails need to keep resolving records that are no
longer active.

This is enforced by a Prisma Client Extension (`src/config/prisma.ts`), not
by application code, so it applies uniformly and can't be forgotten at a call
site:

- `delete` / `deleteMany` on these models are rewritten into
  `update` / `updateMany { isActive: false }` — the row stays in the table.
- Reads (`findMany`, `findFirst`, `findUnique`, `count`) get `isActive: true`
  injected into `where` by default, so deactivated rows are invisible unless
  asked for.

**Opting out:** pass `isActive: undefined` explicitly inside `where` to
include deactivated records, e.g.:

```ts
await prisma.client.findMany({ where: { isActive: undefined } });
```

An explicit key in `where` — even set to `undefined` — is left untouched by
the extension; only a `where` with no `isActive` key at all gets the default
filter applied.

## Test database

Integration tests run against a real PostgreSQL database — `abra_test` —
kept separate from `abra_dev` so a test run can never touch development
data:

- `docker/postgres-init/01-create-test-db.sql` creates `abra_test` alongside
  `abra_dev` on the Postgres container's **first** startup only. If you
  already had the `postgres-data` volume from before this change, the script
  won't run automatically — either `docker compose down -v` (destroys the
  volume) or connect once and run `CREATE DATABASE abra_test;` by hand.
- `vitest.config.ts` points every test process at `abra_test` via `testEnv`
  (`src/test/testEnv.ts`), and registers `src/test/globalSetup.ts` to run
  `prisma migrate deploy` against it before the suite starts — the same
  migrations every other environment gets, applied once per run rather than
  once per test file.
- Before migrating, `globalSetup` calls `guardAgainstDevDatabase`
  (`src/test/guardAgainstDevDatabase.ts`), which compares the test
  `DATABASE_URL` against `.env`'s directly and aborts the run if they match
  — tests truncate every table after each one runs, so pointing them at the
  dev database would destroy it.
- Each integration test calls `resetDatabase()` (`src/test/resetDatabase.ts`)
  in its own `afterEach`, truncating every table so writes don't leak
  between tests. It isn't wired in globally, so tests that never touch the
  database don't pick up a DB dependency they don't need.
- `src/test/factories.ts` builds valid `User`/`Client`/`Project`/`Task` rows
  inline (auto-creating parents up the hierarchy as needed), so integration
  tests don't need hand-written fixtures.
- All test files share this one real database, so `vitest.config.ts` sets
  `fileParallelism: false` — Vitest's default parallel-file execution would
  let one file's `resetDatabase()` truncate rows another file is mid-test
  with. Running files sequentially trades some suite speed for the
  isolation the tests actually need.

**In CI:** bring up `docker compose up -d postgres` (or run an equivalent
`postgres:16-alpine` service with the same init script mounted) before
`npm test`. No other setup is required — `globalSetup` handles migrations,
and the suite is safe to run repeatedly with no manual cleanup between runs.

## API documentation

`src/config/swagger.ts` builds an OpenAPI document from `@openapi` JSDoc
annotations kept beside each route definition — there's no separate spec
file to keep in sync. Served in every environment except production:

- `/api-docs` — interactive Swagger UI, with the bearer-token security
  scheme wired up so a token pasted into the UI is sent on every request.
- `/api-docs.json` — the raw OpenAPI document.

`GET /health` (`src/routes/health.routes.ts`) is fully annotated as the
worked example, including both its 200 and 503 responses; the shared error
contract is declared once as a reusable `Error` schema component and
referenced from there.

## Login rate limiting

`POST /login` and `PATCH /me/password` (`src/middleware/rateLimit.middleware.ts`)
count failed attempts within a rolling window and reject with `429` once a
threshold is exceeded — `/login` on both the submitted email and the client
address, `/me/password` on address only (see the comment at its route
wiring in `src/routes/auth.routes.ts` for why it has no per-account leg).

**Counters are in-process, not shared storage.** They live in a `Map`
(`src/services/rateLimitStore.ts`), not Postgres or Redis — a deliberate
trade-off to avoid a migration and a new service for what's a hint, not a
hard security boundary (see `openspec/changes/login-rate-limiting/design.md`
for the full reasoning). Two consequences to keep in mind:

- **They reset on every restart and deploy.** An attacker who can trigger or
  outlast a restart gets a fresh quota. Fine for raising attacker cost on an
  internal app; don't treat it as a guarantee.
- **They don't survive scaling past one backend replica.** Each replica
  keeps its own counters, so N replicas give an attacker roughly N× the
  effective attempts — nothing fails loudly when this happens. If this
  service is ever scaled horizontally, move this to shared storage first.

`TRUST_PROXY` governs how the client address is resolved from
`X-Forwarded-For` (Express's `trust proxy` setting) and defaults to
disabled — safe for this project's `docker-compose` setup, where there's no
proxy in front of the backend. Set it only when deploying behind one you
actually trust; enabling it without a real proxy in front lets any client
pick its own rate-limit bucket by forging the header.

## Time reports

`POST /reports` and `POST /reports/batch` take one **day attendance window**
(`startTime` / `endTime` as `HH:mm`) plus per-project `hours` from `0.5` to
`24` with at most one decimal place (`3.3` yes, `3.34` no). If `endTime` is earlier than or equal to `startTime`,
the window continues into the next calendar day (equal clocks = 24 hours).
Project hours may sum to less than the window (unallocated lunch/rest);
they must not exceed it (`400` `HOURS_EXCEED_WINDOW`). Batch copies the
request window onto every stored row and **replaces** any rows the caller
already saved on that date (so a second save does not duplicate hours).

`DELETE /reports?date=YYYY-MM-DD` removes every row the authenticated caller
saved on that calendar date (`204`). It never touches another user's rows.
A date with no rows for the caller is `404`.

## Absences

`GET /absences?month=&year=` lists the caller's absences whose range overlaps
that calendar month (`200`). Unauthenticated callers get `401`.

`POST /absences` creates one full-day absence for the authenticated caller
(`type` `VACATION` / `SICK` / `RESERVE_DUTY` / `OTHER`, `startDate`, optional
inclusive `endDate`). Friday and Saturday are excluded from `workingDayCount`;
a weekend-only range is `400`. Overlap with another absence or with reported
work hours is `409` with per-date details. Attachments and half-day are later
tickets. The same write rate limit as report POSTs applies.

`DELETE /absences/:id` cancels that absence for the authenticated owner
(`204`). The row is soft-deleted (`isActive` false) so it stays in history.
The whole range is cancelled, not one day inside it. Another user's id is
`403`; an unknown or already-cancelled id is `404`.

## Admin catalog

All `/admin/*` routes require an administrator (`401` unauthenticated, `403`
authenticated but not admin). List endpoints include inactive rows so an
admin can reactivate them.

- `GET /admin/users` — every account (`displayName`, email, role, `isActive`).
- `GET`/`POST /admin/clients`, `PATCH /admin/clients/:id` — `isActive: false` is soft-delete.
- `GET`/`POST /admin/projects`, `PATCH /admin/projects/:id` — create only under an active client. `reportFormat` is `CLOCK_IN_OUT` (default) or `SUM_HOURS`.
- `GET`/`POST /admin/tasks`, `PATCH /admin/tasks/:id` — create only under an active project. Closing a task is `status: CLOSED` (the UI "delete task").
- `GET /admin/assignments` — one row per **OPEN** task under an active client and project, with assigned workers.
- `POST /admin/assignments` `{ taskId, userIds[] }` — skip duplicates; unknown/inactive users are `400`.
- `DELETE /admin/assignments?taskId=&userId=` — `204`, or `404` if that pair is not assigned.

## Write rate limiting

`POST /reports`, `POST /reports/batch`, `POST /absences`, and
`DELETE /absences/:id`
(`src/middleware/writeRateLimit.middleware.ts`) cap how many writes one
authenticated caller can drive within the same window — every request counts,
not just the failures, because what needs bounding is a valid token replaying
a multi-row transactional insert. `RATE_LIMIT_WRITE_MAX_REQUESTS` (default 60)
sets the ceiling; a caller over it gets the same `429` and `Retry-After` the
credential routes produce.

The key is the JWT subject, not the address, so a whole office behind one NAT
address is never throttled collectively — which is why the limiter is wired
*after* `authenticate`. Counters are in-process here too, with the same
restart and multi-replica caveats as above.

This one is built on `express-rate-limit` rather than our own store. Beyond
not having to hand-roll request counting, CodeQL's `js/missing-rate-limiting`
only models the known limiter libraries, so a route guarded by a home-grown
middleware stays flagged — the alerts still open against `auth.routes.ts` are
exactly that. Prefer this middleware for any new route that writes.

## File storage

Attachments (sick notes, reserve-duty confirmations — PDFs and photos,
1-5 MB) are metadata in PostgreSQL plus bytes on disk, not `bytea` in the
database: `bytea` would bloat every `pg_dump`, defeat streaming responses,
and consume the free-tier database quota that should hold years of report
rows instead.

- `src/types/fileStorage.ts` declares the `FileStorage` interface
  (`store`/`retrieve`/`delete`) that calling code depends on — never the
  concrete implementation directly.
- `src/services/localFileStorage.ts` is the only implementation right now:
  bytes live under `STORAGE_DIR` (default `./storage/uploads`, a mounted
  volume in Docker/production). The original filename is discarded on
  write — only its extension survives — so a generated key
  (`crypto.randomUUID() + extension`) is what actually touches the
  filesystem. That's what makes path traversal in an uploaded filename
  harmless: there's no user-supplied path component left to sanitise.
- `src/services/attachment.service.ts` enforces who can retrieve what
  (owner or administrator) and streams bytes back rather than buffering a
  whole file into memory.

**Free-tier filesystems are ephemeral.** Render's and Railway's free tiers
don't persist container disks — an uploaded file vanishes on redeploy. The
`FileStorage` interface exists so this is a known, contained gap: swapping
in an S3-compatible store (Cloudflare R2 and Backblaze B2 both have real
free tiers) means writing a new implementation of that interface and
pointing the app at it — no changes to `attachment.service.ts` or the
routes/controllers that call it.
