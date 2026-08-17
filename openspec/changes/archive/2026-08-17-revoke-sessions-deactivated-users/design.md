## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **Auth is stateless HS256, payload `{ sub, role }`.** No `Session` or `RefreshToken` table exists;
  `auth.middleware.ts` performs zero database access today. Everything a request knows about its caller
  comes from a token that may have been minted 30 days ago.
- **`User` is already in `SOFT_DELETE_MODELS`** (`src/config/prisma.ts`). The extension injects
  `isActive: true` into `findUnique`/`findFirst`/`findMany`/`count`/`aggregate`/`groupBy`, and rewrites
  `delete` into `update { isActive: false }`. It does **not** intercept `update`/`updateMany` — which
  matters: reactivating a deactivated row through `prisma.user.update` works without any opt-out.
- **Express 5.2.1.** Rejected promises from middleware are forwarded to the error handler automatically,
  so `authenticate` can become `async` without a `try/catch` wrapper or an `asyncHandler` utility.
- **The error contract is one shape.** `AppError` carries `{ status, code, message }`; `TOKEN_EXPIRED` is
  already constructed inline as `new AppError(401, 'TOKEN_EXPIRED', …)` rather than via a static factory.
- **SCRUM-197 (`User Logout` → "Invalidate JWT/session on the backend") is still To Do.** It needs real
  token revocation. This change must not build a competing mechanism that SCRUM-197 then has to unpick.
- **`requireRole` reads `req.user.role`** and nothing else, so changing where that value comes from
  changes authorization everywhere with no edits to `requireRole` itself.

## Goals / Non-Goals

**Goals:**

- Deactivation takes effect on the caller's very next request, at any token age.
- A deactivated administrator cannot reach `POST /admin/users` and mint a replacement account.
- Deactivation is reachable and reversible through the API, not only through `psql`.
- Role changes take effect on the next request too, since the lookup that makes this possible is already
  being paid for.
- Leave the door open for SCRUM-197 rather than pre-empting it.

**Non-Goals:**

- A `Session`/`RefreshToken` table, refresh endpoint, per-device revocation, or httpOnly cookies.
- Logout-driven invalidation, "log out all my devices", or revocation on password change.
- Any frontend change, including a dedicated message for the new error code.
- An admin user-list endpoint. Without one, an admin needs a user id from elsewhere to call the new
  endpoint — accepted, and consistent with the existing reset-password and role endpoints.
- Server-side enforcement of `mustChangePassword`, even though the fetched row now makes it trivial.

## Decisions

### D1: Re-check the account on every authenticated request, uncached

`authenticate` verifies the token as it does today, then loads the user row by `sub` and rejects if the
account is missing or inactive. One indexed primary-key read per authenticated request.

This is option 1 from the ticket. It closes the window completely — the exposure becomes the duration of
one request rather than up to 30 days — needs no migration, and adds no concept the codebase does not
already have.

*Alternatives considered:*

- **A `Session` table with refresh tokens** — the architecturally correct answer, and the one the
  remember-me design named as the real fix. Rejected here because it is SCRUM-197's job, spans both
  frontend and backend, and would leave two half-built revocation stories in flight at once. When
  SCRUM-197 lands, the lookup added here becomes redundant and can be folded into the session read it
  will already be doing.
- **A `sessionsValidFrom` timestamp on `User`, compared against the token's `iat`** — a genuine middle
  ground: same one read per request, but it also gives "log out everywhere" and revocation on password
  change. Rejected because *this* ticket needs none of that, the column is dead weight until SCRUM-197
  gives it a second consumer, and SCRUM-197 may well prefer per-session rows to a per-user epoch anyway.
  Adding it now guesses at that decision.
- **Caching the active-user set with a short TTL** — trades exactly the property this change exists to
  buy. A 60-second TTL means a deactivated admin still has 60 seconds to create a backdoor account. The
  read is a primary-key hit on a table the size of one company's headcount; there is no measured problem
  to optimize away. Revisit only if profiling says so.

### D2: Query with the soft-delete filter explicitly opted out, then check `isActive` in code

```
prisma.user.findUnique({ where: { id: payload.sub, isActive: undefined } })
```

The extension would otherwise inject `isActive: true` and return `null` for a deactivated user — which
would work, but collapses two distinct cases into one and makes the middleware's behavior depend on an
implicit rewrite happening two modules away. Opting out and branching explicitly lets us return an
accurate code for each case and makes the middleware readable on its own terms:

| Result | Response |
|---|---|
| `null` — no such account | `401 UNAUTHORIZED` (same as any other unverifiable caller) |
| row with `isActive: false` | `401 ACCOUNT_DEACTIVATED` |
| row with `isActive: true` | proceed |

*Alternative considered:* **rely on the implicit filter and treat `null` as deactivated.** One fewer
concept in the query, but it reports `ACCOUNT_DEACTIVATED` for a subject that never existed, and a reader
who does not know about the extension sees a lookup that appears not to check `isActive` at all.

### D3: `ACCOUNT_DEACTIVATED` as a third 401 code, constructed inline

`new AppError(401, 'ACCOUNT_DEACTIVATED', 'Account is no longer active')`, matching how `TOKEN_EXPIRED`
is built rather than adding an `AppError.accountDeactivated()` static — the static factories cover generic
HTTP statuses, not situation-specific codes.

Status stays `401`, not `403`: the caller has no usable identity, and `403` would tell the frontend's
global handler to leave the dead session in place. Disclosing "deactivated" specifically leaks nothing —
the caller already holds a validly signed token for that exact account.

The frontend needs no change to be correct: `apiClient`'s 401 handler clears the session, toasts, and
redirects regardless of code. The distinct code exists so a later frontend ticket *can* say "your account
has been deactivated" in Hebrew instead of "Session Expired", which is currently a lie in this case.

### D4: `req.user` keeps its `{ sub, role }` shape; only the source of `role` changes

`sub` continues to come from the verified token. `role` comes from the freshly-read row. `JwtPayload`
stays the type of the *token*; `req.user` is retyped to a small `AuthenticatedUser` interface with the
same two fields, so the two stop being accidentally interchangeable.

Not widening `req.user` to the whole user row is deliberate: `displayName` and `email` on the request
object invite endpoints to read identity data from the middleware instead of from a service, and every
field added there becomes a field the next auth mechanism has to keep supplying.

Consequence worth stating plainly: **`requireRole` silently becomes stronger.** No edit to it, but a
demoted admin now loses access on their next request. That is the intended fix, not a side effect — see
the modified `backend/auth-middleware` spec.

### D5: `PATCH /admin/users/:id/status` with `{ isActive: boolean }`, not `DELETE /admin/users/:id`

`DELETE` would honor the SCRUM-51 soft-delete convention and cost less code — the extension already
rewrites it — but it is one-way. Deactivating the wrong person would then need database access to undo,
which is exactly the operational trap this change is meant to remove. The symmetric `PATCH` also matches
the shape of its two siblings, `PATCH /admin/users/:id/role` and `PATCH /admin/users/:id/reset-password`.

Implementation reuses `updateUserOrNotFound(id, { isActive })` unchanged: `update` is not intercepted by
the soft-delete extension, so it finds and reactivates a deactivated row with no opt-out, and its existing
`P2025 → 404` mapping already gives the unknown-user case.

Setting `isActive` to the value it already holds is a successful no-op returning `200`, not a `409`. It
is idempotent by nature, and an admin clicking twice should not see an error.

### D6: No self-deactivation guard and no last-admin guard

An administrator can deactivate themselves and be locked out on their next request. This follows the
precedent set explicitly for the role endpoint — "No self-demotion or last-admin restriction (see
SCRUM-83 design — YAGNI, not required by spec)" — and adding the guard here while `role` lacks it would
be inconsistent in a way that reads as an oversight rather than a decision.

The failure mode is recoverable only by another administrator or by direct database access. Noted in
Risks; worth a follow-up ticket that covers both endpoints together if the team wants it.

### D7: Reworking `auth.middleware.test.ts` is part of the change, not incidental

That file signs tokens for subjects like `'user-1'` and `'admin-1'` that exist in no table, and asserts
`200` on `/sample/protected`. Under the new middleware every one of those becomes a `401`. The rework
creates real users via the existing `createUser` factory and threads `user.id` into the token — the same
pattern `adminUser.routes.test.ts` and `attachment.routes.test.ts` already use, so the fix is mechanical
and the test file ends up more honest than it was.

This is the one place where "no public contract change" is not quite true internally: a valid token for a
nonexistent user used to be accepted, and no longer is.

## Risks / Trade-offs

- **One extra database round-trip on every authenticated request** → Accepted, and the direct cost of the
  guarantee. Primary-key lookup on a table sized to one company's staff. If it ever shows up in a profile,
  the fix is SCRUM-197's session architecture, not a cache (see D1).
- **A database outage now fails authentication, where before it only failed the endpoints that touched
  the database** → In practice near-total overlap: every protected endpoint already reads or writes.
  `/health` is unauthenticated and unaffected.
- **An administrator can lock themselves out** (D6) → Accepted, consistent with the role endpoint.
  Recoverable by any other administrator through the same endpoint.
- **This change will be partly superseded by SCRUM-197** → Intended. The lookup is ~10 lines in one
  function; when session-backed revocation lands, the `isActive` check folds into the session read. Cheap
  to write, cheap to retire — which is precisely why the bigger mechanism was not built now.
- **Deactivation still does not invalidate anything the user already downloaded**, and their time reports
  and attachments remain in place → Out of scope and correct: this is access revocation, not data
  removal or retention policy.
- **No admin user-list endpoint means an admin must already know the user id** → Accepted; identical to
  the two existing admin endpoints. A list endpoint is its own ticket.

## Migration Plan

1. **No database migration.** `User.isActive` already exists with `@default(true)`, so every existing
   account is active and no row changes.
2. **No coordinated deploy.** Backend-only, additive to the API. An unchanged frontend keeps working: the
   new `401 ACCOUNT_DEACTIVATED` flows through the same global handler that already covers `401`.
3. **Deploy effect on live sessions:** none for active users. Any token belonging to an account already
   marked inactive in the database stops working at deploy time — the intended outcome.
4. **Rollback** is a plain revert. Nothing persisted changes shape, so a reverted backend simply returns
   to accepting tokens for deactivated accounts. Any account deactivated through the new endpoint stays
   deactivated and is still blocked at login, just not mid-session.
