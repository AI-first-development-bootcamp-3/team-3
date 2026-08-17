## Why

There is no way to log out. `POST /login` mints a token and the frontend stores it, but nothing anywhere
in the product ends a session on purpose — no button, no endpoint, no teardown. A user on a shared machine
cannot hand the browser to the next person, and a user who suspects their token leaked has no recourse but
to wait out its lifetime, which SCRUM-181's "remember me" stretched to 30 days.

`revoke-sessions-deactivated-users` closed the *administrative* half of this (deactivation now bites on the
next request) and explicitly left voluntary revocation to SCRUM-197, declining to guess at the mechanism so
that two half-built revocation stories would not be in flight at once. This change is that mechanism.

## What Changes

- **New `POST /logout`**, authenticated. It stamps a new `sessionsValidFrom` timestamp on the caller's
  user row and returns `204`. Calling it twice is a successful no-op, not an error. SCRUM-195 names this
  `POST /auth/logout`, but `authRouter` is mounted without a prefix — its siblings are `/login` and
  `/me/password` — so the unprefixed path is what keeps the API consistent.
- **`User.sessionsValidFrom`** — one new column, defaulting to `now()`. Logout moves it forward; every token
  issued before it becomes unusable.
- **`authenticate` gains a third gate.** After verifying the token and confirming the account is active, it
  compares the token's `iat` against the stored `sessionsValidFrom` and rejects an older token with `401`
  and a new `SESSION_REVOKED` code, distinct from `TOKEN_EXPIRED` and `ACCOUNT_DEACTIVATED`. No extra query:
  the user row is already read on every authenticated request.
- **`login` now records `iat` explicitly** so the comparison has a dependable basis, and stamps
  `sessionsValidFrom` no further — logging in does not revoke your other sessions.
- **Logout ends every session for that user, on all devices.** Chosen deliberately (design D1); a per-token
  `jti` denylist would scope it to one device at the cost of a table, a second lookup, and a purge job.
- **Logout control in the header** (`Layout.tsx`), Hebrew-labelled and RTL-consistent with the existing menu.
- **Client teardown and redirect**: the frontend calls the endpoint, clears the session from both storages
  and from memory, drops cached server data, and lands the user on `/login`. A failed or unreachable logout
  call still completes the client-side teardown — a user asking to log out must always end up logged out.
- **Proactive auto-logout at token expiry**: a timer armed from the session's stored `expiresAt` ends the
  session the moment the token lapses, rather than leaving authenticated UI on screen until the next API
  call happens to `401`. `apiClient`'s existing reactive 401 handling stays as the backstop for clock skew.
  Idle-inactivity logout is explicitly **not** in scope.
- **Cross-tab logout sync**: logging out in one tab ends the session in every other open tab of the same
  browser, and a `SESSION_REVOKED` rejection in one tab does the same.
- **BREAKING (internal only):** tokens signed without an `iat` claim are now rejected, so any test that
  hand-rolls a JWT payload must be updated. Live user tokens are unaffected — but only because the migration
  backfills `sessionsValidFrom` to *before* the oldest possible live token rather than to `now()`; defaulting
  existing rows to the migration timestamp would log every current user out on deploy (see design.md,
  Migration Plan).

## Capabilities

### New Capabilities

- `backend/logout-endpoint`: The authenticated endpoint that ends a session — what it does to server-side
  state, what it returns, its idempotence, and the fact that it revokes all of the caller's tokens rather
  than only the presented one. No existing spec covers ending a session; `backend/login-endpoint` stops at
  issuing one.
- `frontend-logout`: The user-facing act of logging out — where the control lives, what teardown it
  guarantees (including when the server call fails), where the user ends up, and how logout propagates to
  other open tabs. Distinct from session *persistence*, which is about surviving reloads.

### Modified Capabilities

- `backend/auth-middleware`: Token verification gains a third gate. A validly signed, unexpired token for
  an active account is no longer sufficient — the requirement now states that a token issued before the
  account's session-validity boundary is rejected, with its own error code.
- `frontend-session-persistence`: Two requirements shift. "Ending a session clears all persisted copies"
  must now also cover propagation to other tabs, and expiry handling becomes proactive — the existing spec
  discards an expired session only at boot or when the server rejects a request, which leaves a live tab
  showing authenticated content after its token has lapsed.

## Impact

**Backend**
- `prisma/schema.prisma` + a migration — `User.sessionsValidFrom DateTime @default(now())`
- `src/middleware/auth.middleware.ts` — the `iat` vs `sessionsValidFrom` comparison and `SESSION_REVOKED`
- `src/services/auth.service.ts` — `logout(userId)`; `login` pins `iat` into the signed payload
- `src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts` — `postLogout` and its OpenAPI block
- `src/middleware/test/auth.middleware.test.ts` — tokens signed without `iat` now fail the new gate
- `src/routes/test/auth.routes.test.ts` — logout, double logout, and reuse of a revoked token

**Frontend**
- `src/pages/Layout.tsx` — the logout control in the existing `Menu`
- `src/services/auth.ts` — `logout()` calling the endpoint
- `src/services/sessionStore.ts` — teardown that also clears the React Query cache; the expiry timer
- `src/services/sessionStorageAdapter.ts` — a cross-tab signal (`storage` event) on removal
- `src/services/apiClient.ts` — a `SESSION_REVOKED` body code routed through the existing 401 path
- Tests for the control, the teardown-on-failure path, the expiry timer, and cross-tab propagation

**Database:** one additive column. `@default(now())` is correct for new users; existing rows are backfilled to
a timestamp older than any live token so that deploying does not log everyone out.

**Compatibility:** additive for clients. The new error code arrives inside the `401` contract every client
already handles, and an unchanged frontend would still degrade correctly via `apiClient`'s global handler.

**Supersedes in part:** the `isActive` lookup added by `revoke-sessions-deactivated-users` now serves two
gates instead of one, exactly as that change's design anticipated. Nothing there needs unpicking.
