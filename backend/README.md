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
npm run seed                # admin + employee users, sample clients/projects/tasks
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
- **Auth:** `authenticate` (`src/middleware/auth.middleware.ts`) verifies
  the bearer token and attaches `req.user`; `requireRole(role)` composes
  after it to restrict a route by role. An unauthenticated request to a
  role-guarded route gets 401, never 403.
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
