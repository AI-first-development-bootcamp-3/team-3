## Why

SCRUM-66: make sure every admin endpoint actually rejects non-admins,
enforced server-side — not only hidden in the UI — with a coverage test that
fails if a future admin route is added without the guard. `authenticate` and
`requireRole` already exist and are already applied per-route on the three
`/admin/users/*` endpoints (`adminUser.routes.ts`), but that's manual,
per-route discipline with nothing enforcing it as the epic adds
clients/projects/tasks/assignments routes.

Depends on: SCRUM-46 (auth middleware) — already shipped (`authenticate`,
`requireRole` in `backend/src/middleware/auth.middleware.ts`).

## What Changes

- `requireRole` marks the middleware it returns (e.g. a property on the
  returned function) so a coverage test can positively identify "this route
  has the admin guard applied" by inspecting Express's route stack, rather
  than by name (an inline arrow function has no reliable `.name`)
- New coverage test: walks `app`'s registered routes, finds every path
  starting with `/admin`, and asserts each carries the guard marker —
  failing loudly if a new `/admin/*` route is registered without it
- No behavior change to the three already-shipped `/admin/users/*` routes —
  they already have the guard; this change makes that guarantee mechanical
  instead of a matter of remembering to add it

### Non-goals

- The clients/projects/tasks/assignments admin routes themselves — those
  are SCRUM-68 through SCRUM-71/215, each of which the coverage test now
  holds to this guarantee as they're added
- Any change to `authenticate`/`requireRole`'s actual authorization logic —
  only a marker for introspection is added

## Capabilities

### New Capabilities

- `backend-admin-api-authz`: the guarantee that every `/admin/*` route is
  guarded, and the coverage test that enforces it

## Impact

- `backend/src/middleware/auth.middleware.ts`: `requireRole` adds an
  identifying marker to its returned handler
- New test file (e.g. `backend/src/routes/adminRouteGuard.coverage.test.ts`)
  walking `app`'s route stack
- No impact to existing route files — no route needs edits since they
  already use `requireRole`
