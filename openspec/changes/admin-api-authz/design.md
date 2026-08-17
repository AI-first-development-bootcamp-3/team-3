## Context

See proposal.md - Why. `authenticate` and `requireRole(role)` already exist
in `auth.middleware.ts` and are already applied on the three
`/admin/users/*` routes in `adminUser.routes.ts`. `requireRole` returns an
anonymous arrow function as an Express `RequestHandler` — Express route
introspection via `app._router.stack` exposes each layer's `handle`
function, but an inline arrow function returned (not assigned to a named
variable) has an empty `.name`, so route-stack inspection can't currently
tell "this is the admin guard" from any other middleware by name alone.

## Goals / Non-Goals

**Goals:**
- Make "every `/admin/*` route has the guard" mechanically checkable, not
  just a convention
- Zero behavior change to already-shipped admin routes

**Non-Goals:**
- Rewriting `authenticate`/`requireRole`'s authorization logic
- A generic "route coverage" framework beyond what this one guarantee needs

## Decisions

**Mark the guard with a property on the returned handler
(`handler.__isAdminRoleGuard = true`), detected via route-stack
introspection.** `requireRole` sets this property on the function it
returns before returning it. The coverage test walks
`app._router.stack`, finds every `route.path` starting with `/admin`
across all registered routers, and checks that at least one middleware
layer in that route's stack carries the marker.

*Alternative considered:* maintain a manually-updated list of "admin routes"
that must have the guard, checked against actual routes. Rejected — that
list is exactly the kind of manually-maintained thing SCRUM-66 exists to
eliminate; it would just move the "did someone remember" problem one level
up.

*Alternative considered:* a lint rule requiring `requireRole` on any router
registered under `/admin`. Rejected — more infrastructure than a runtime
route-stack check for the same guarantee, and the acceptance criteria ask
for a test, not a lint rule.

## Risks / Trade-offs

- [Reaching into `app._router.stack` (an Express internal, not a public API)
  is a bit fragile across Express major versions] → Acceptable: the backend
  already pins its Express version; if it's upgraded, this test failing to
  even run would itself be a strong, immediate signal to update the
  introspection approach.
