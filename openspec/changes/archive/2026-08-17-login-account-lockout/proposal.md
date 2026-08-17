## Why

`login-rate-limiting` shipped a throttle that stops a burst of password guesses, but its counters live in a `Map` inside one Node process — [`rateLimitStore.ts`](../../../backend/src/services/rateLimitStore.ts) says so in its own header comment: *"Counters are lost on restart and are not shared across replicas."* A redeploy hands an attacker a fresh five guesses, and a second replica doubles every threshold. Nothing survives the process, and nothing records that any of it happened, so there is no trail to review after the fact.

This closes SCRUM-188 (account lockout), SCRUM-189 (lockout message with remaining time), and SCRUM-190 (audit log of failed attempts), plus the locked-account case of SCRUM-193.

## What Changes

- Add a `login_attempts` table recording every failed credential attempt: normalised email, nullable user id, client address, outcome, timestamp. This is the audit trail SCRUM-190 asks for, and the lock in SCRUM-188 is derived by counting its rows rather than stored as a separate flag.
- Add a durable lockout tier above the existing throttle: 10 failed attempts for one email within 24 hours locks that email for 30 minutes (all three deployment-configurable). Because it is computed from table rows, it survives process restart and is shared across replicas — the two properties the in-memory throttle explicitly lacks.
- **Key the lock on the submitted email string, not on a user row.** A lock keyed by foreign key could never fire for an unregistered email, which would make "did this lock?" an account-existence oracle and break the non-enumeration guarantee `backend/login-rate-limiting` already makes. Unknown emails accumulate attempts and lock identically to real ones.
- Reject a locked attempt with `423` before any password comparison, carrying `Retry-After`. `423` is distinct from the throttle's `429` so the client can word the two differently; it does **not** distinguish a real account from an unknown one, since both lock on the same terms.
- Login page renders a third error branch beside its existing 401 and 429 cases, showing the remaining lock time and counting it down live.
- A successful login clears that email's accumulated failures, matching the throttle's existing behaviour.

Not in scope: an admin unlock action. The lock self-expires, and `isActive` already provides an admin-controlled, indefinite login block with an admin route behind it — a second sticky per-user flag would be duplicate mechanism. Also not in scope: moving the existing 15-minute throttle off its in-memory store. Tier 2 stays as built; this change adds tier 3 above it.

## Capabilities

### New Capabilities

- `backend/login-attempt-audit`: What is recorded for each failed credential attempt, what is deliberately not recorded, and the retention/queryability of that record.
- `backend/login-account-lockout`: The durable lock — its threshold, window, and duration; that it is keyed on the submitted email so it leaks no account-existence information; that it self-expires without intervention; and the `423` response contract.

### Modified Capabilities

- `backend/login-endpoint`: The login requirement gains a locked-rejection outcome alongside its existing `200`/`400`/`401`/`429` cases. This capability still lives only in the unarchived `minimal-login`, `remember-me-token-expiry`, and `login-rate-limiting` changes rather than under `openspec/specs/`; this delta stacks on those the same way `login-rate-limiting` stacked on `minimal-login`.
- `frontend-auth-routing`: The login page gains a required distinct rendering for a locked response, showing remaining time, separate from the invalid-credentials, throttled, and generic-failure cases.

## Impact

**Database**
- `prisma/schema.prisma` — new `LoginAttempt` model; migration adding `login_attempts` with an index on `(email_normalized, created_at)`.

**Backend**
- `src/config/env.ts` — `LOCKOUT_MAX_ATTEMPTS`, `LOCKOUT_WINDOW_HOURS`, `LOCKOUT_DURATION_MINUTES`; `.env.example` and `docker-compose.yml` updated to match.
- `src/types/errors.ts` — `AppError.locked`, status `423`, new error code.
- `src/services/` — new `loginAttempt.service.ts` recording attempts and computing lock state.
- `src/middleware/rateLimit.middleware.ts` — the `res.on('finish')` hook that already observes 401/200 becomes the write point for the audit record, so attempt recording and throttle counting stay in one place.
- `src/routes/auth.routes.ts` — lock check ahead of the handler; OpenAPI `423` documented.

**Frontend**
- `src/pages/Login.tsx` — third error branch with a live countdown.
- `src/api/` — `Retry-After` surfaced on `ApiError` if not already available.

**Tests**
- Backend: lock trips at threshold, unknown and registered emails lock identically, lock survives a rebuilt store, success clears failures, lock expires on its own, audit rows written with the expected fields.
- Frontend: locked response renders the countdown; the countdown decrements.
- Closes the locked-account gap that is the only unmet item in SCRUM-193.
