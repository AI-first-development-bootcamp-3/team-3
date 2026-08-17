## Why

Deactivation is the emergency brake for an account, but today it only works at the login door. `login()`
checks `isActive`; `auth.middleware.ts` never looks at the database again, so an already-issued JWT keeps
working until it expires — up to 30 days now that SCRUM-181 shipped "remember me". Flagged as a known
limitation in `openspec/changes/remember-me-token-expiry/design.md` and tracked as SCRUM-218.

The sharpest case is a deactivated **administrator**. `requireRole` reads the role off the token, so within
that window an ex-admin can still call `POST /admin/users` with a temporary password of their choosing and
mint a fresh active account — access that **outlives the revoked token entirely**. The same staleness
applies to `PATCH /admin/users/:id/role`: a demoted admin keeps administrator rights until their token
lapses, and unlike deactivation that hole is reachable through the API today.

There is also nothing to *do* the deactivating: `/admin/users` supports create, reset-password, and
role-change, but nothing sets `isActive`. Shipping the guard alone would defend a state the product cannot
produce, so this change adds both halves.

## What Changes

- `authenticate` loads the caller's user row after verifying the token. A caller whose account is
  deactivated (or whose row is gone) is rejected `401` with a new `ACCOUNT_DEACTIVATED` code, distinct
  from `TOKEN_EXPIRED` and generic `UNAUTHORIZED`. The check applies to every route behind `authenticate`,
  with no per-route opt-in.
- `req.user.role` becomes the **stored** role rather than the token's claim, so a role change takes effect
  on the caller's next request instead of at their next login. `req.user.sub` still comes from the token.
- New `PATCH /admin/users/:id/status` taking `{ isActive: boolean }` — symmetric, so an accidental
  deactivation is undoable without database access. Administrator-only, like its sibling endpoints.
- **BREAKING (internal only):** every authenticated request now performs one indexed primary-key read.
  No public contract changes, but a valid token for a nonexistent user — which the current middleware
  accepts — is now rejected. This affects `auth.middleware.test.ts`, which signs tokens for fabricated
  subjects like `user-1`.

Deliberately **not** in scope: a `Session`/refresh-token table, per-device revocation, httpOnly cookies,
or logout-driven invalidation. That architecture is SCRUM-197's (`User Logout`), and this change is
designed to be subsumed by it rather than to pre-empt it. Also out of scope: any frontend change, an admin
user-list endpoint, and server-side enforcement of `mustChangePassword`.

## Capabilities

### New Capabilities

- `backend/admin-user-activation`: An administrator's ability to deactivate and reactivate a user account
  through the API, who may do it, and what the endpoint reports. No spec covers setting `isActive` today —
  `backend/admin-user-creation` stops at creation.

### Modified Capabilities

- `backend/auth-middleware`: Token verification gains a second gate. Verifying signature and expiry is no
  longer sufficient — the requirement now states that the account backing the token must still exist and
  be active at request time, and that the caller's role is the one currently stored rather than the one
  claimed by the token.

## Impact

**Backend**
- `src/middleware/auth.middleware.ts` — `authenticate` becomes async and reads the user row; `requireRole`
  is untouched but now sees a fresher role
- `src/types/errors.ts` — the `ACCOUNT_DEACTIVATED` code, if codes are enumerated there
- `src/types/express.d.ts` / `src/types/auth.ts` — `req.user`'s shape if it grows beyond `{ sub, role }`
- `src/services/adminUser.service.ts` — `setUserActive(id, isActive)`, reusing the existing
  `updateUserOrNotFound` helper
- `src/controllers/adminUser.controller.ts`, `src/routes/adminUser.routes.ts` — the new endpoint and its
  OpenAPI block
- `src/types/adminUser.schema.ts` — body schema for `{ isActive }`
- `src/middleware/test/auth.middleware.test.ts` — **must be reworked**: it currently signs tokens for
  subjects that do not exist in the database, which the new lookup rejects
- `src/routes/test/adminUser.routes.test.ts` — coverage for the new endpoint

**No database migration.** `User.isActive` already exists, and `User` is already in `SOFT_DELETE_MODELS`
in `src/config/prisma.ts`, so `prisma.user.findUnique` filters deactivated rows out for free.

**No frontend change.** `apiClient`'s existing global 401 handler already clears the session, toasts, and
redirects to `/login`, so a revoked caller degrades gracefully today. A dedicated Hebrew message for
`ACCOUNT_DEACTIVATED` is a separate frontend ticket.

**Performance:** one extra primary-key read per authenticated request, uncached. Deliberate — a cache
reintroduces the exposure window this change exists to close.

**Compatibility:** additive for clients. The new error code arrives inside the existing `401` contract,
which every client already handles.
