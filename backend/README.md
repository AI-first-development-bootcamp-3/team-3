# Backend

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

**In CI:** bring up `docker compose up -d postgres` (or run an equivalent
`postgres:16-alpine` service with the same init script mounted) before
`npm test`. No other setup is required — `globalSetup` handles migrations,
and the suite is safe to run repeatedly with no manual cleanup between runs.
