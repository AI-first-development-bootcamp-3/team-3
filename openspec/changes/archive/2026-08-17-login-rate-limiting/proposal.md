## Why

`POST /login` accepts unlimited password guesses. `auth.service.ts` does a Prisma lookup and a `bcrypt.compare` on every request and returns a uniform `401` — nothing counts attempts, nothing slows an attacker down, and nothing records that a burst happened. A script can guess passwords against a known employee email as fast as the API will answer.

This closes SCRUM-183 and SCRUM-191, which describe the same work under two different parent stories (SCRUM-58 User Login, SCRUM-59 Invalid Login Handling). They should be resolved together so the throttle is not built twice.

## What Changes

- Add a throttle in front of the credential-handling routes. Failed attempts are counted against two independent keys, and exceeding either threshold rejects the request with `429` before any password comparison runs.
  - **Per submitted email**: 5 failures per 15 minutes (deployment-configurable).
  - **Per client IP**: 50 failures per 15 minutes (deployment-configurable), to catch one host spraying many accounts. Derived as the email threshold × the number of people plausibly behind one shared office address, so the address leg cannot fire before the email leg during legitimate use.
- Count only *failed* attempts. A successful login clears that email's counter.
- Throttle on the **submitted email string**, whether or not an account exists, so a throttled response never reveals that an email is registered. This preserves the existing indistinguishability guarantee on the login endpoint.
- Protect both `POST /login` and `PATCH /me/password`.
- Add a `429` case to the shared error contract: `AppError` gains a `tooManyRequests` factory, and the response carries a `Retry-After` header.
- Add `TRUST_PROXY` configuration and apply it to the Express app, defaulting to disabled. Without it `req.ip` is the Docker bridge gateway for every request, which collapses all users into a single per-IP bucket — but enabling it where no proxy exists is worse, since any client could then choose its own bucket. The safe default is accepted, with the per-email leg carrying the real protection until a deployment configures its proxy.
- Login page renders a distinct "too many attempts" message instead of its current generic fallback, which today shows "Something went wrong. Please try again." for any non-401 response.

Not in scope: **account lockout (SCRUM-188)**. That is a different mechanism — sticky state requiring an admin to clear it, a schema migration, and an unlock path — and stays a separate ticket. This change is a self-recovering time-window throttle.

## Capabilities

### New Capabilities

- `backend/login-rate-limiting`: Counting failed credential attempts, the thresholds and window, the `429` response contract, and the guarantee that throttling leaks no account-existence information.

### Modified Capabilities

- `backend/login-endpoint`: The login and password-change requirements gain a throttled-rejection outcome alongside their existing `200`/`400`/`401` cases. Note this capability currently lives only in the unarchived `minimal-login` and `remember-me-token-expiry` changes, not yet under `openspec/specs/`; this delta stacks on top of them the same way `remember-me-token-expiry` stacked on `minimal-login`.
- `frontend-auth-routing`: The login page gains a required distinct rendering for a throttled response, separate from both the invalid-credentials message and the generic-failure fallback.

## Impact

**Backend**
- `src/app.ts` — `trust proxy` setting.
- `src/config/env.ts` — new `TRUST_PROXY` and rate-limit threshold/window variables; `.env.example` and `docker-compose.yml` updated to match.
- `src/types/errors.ts` — `AppError.tooManyRequests`, status `429`, new error code.
- `src/middleware/` — new rate-limit middleware plus an in-memory attempt store.
- `src/routes/auth.routes.ts` — middleware wired onto both routes; OpenAPI `429` responses documented.
- `src/services/auth.service.ts` — signals success so the counter can be cleared.

**Frontend**
- `src/pages/Login.tsx` — a `429` branch in the existing `catch`.
- `src/services/auth.ts` / `apiClient` — surface enough of the response for the page to render the throttled state.

**Accepted limitations** (detailed in `design.md`)
- The counter is **in-memory**: it resets on every restart and deploy, and it is per-process. The backend cannot be scaled past one replica without the throttle silently weakening. This was chosen deliberately over Postgres or Redis to avoid a migration and a new service.

- With `TRUST_PROXY` disabled by default, the per-IP leg attributes every containerised request to the Docker bridge gateway and so acts as one global bucket. It becomes meaningful only once a deployment declares its proxy.
