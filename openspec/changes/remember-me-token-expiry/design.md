## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **Auth is stateless HS256.** No `Session` or `RefreshToken` table exists in `schema.prisma`; there is no
  refresh endpoint and no server-side revocation path. Token lifetime is the *only* lever available.
- **`sessionStore` is plain in-memory Zustand**, chosen deliberately so `apiClient.ts` can read the token
  outside React via `getState()` (see SCRUM-39's design). Any persistence must preserve that property.
- **The expiry-handling path already exists.** `apiClient.request()` catches 401, clears the session,
  toasts "Session Expired", and redirects to `/login`. `auth.middleware.ts` already returns a distinct
  `TOKEN_EXPIRED` error code for expired tokens. We consume existing behavior rather than adding new
  expiry plumbing.
- **`login()` opts out of the global 401 handler** (`handleUnauthorizedGlobally: false`), because a 401
  there means bad credentials, not a lapsed session. That stays as is.

## Goals / Non-Goals

**Goals:**

- A reload never silently signs a user out — closing the refresh-logout bug is the primary user-visible win.
- One narrow contract between backend and frontend, so the two halves can be implemented independently.
- Token lifetimes configurable per deployment instead of compiled in.
- No database migration, no new endpoints, no new runtime dependencies.

**Non-Goals:**

- Sliding/renewing expiry, refresh tokens, server-side revocation (see Risks — Known limitation).
- A logout button, if one does not already exist. This change only guarantees that *whenever* the session
  is cleared, all persisted copies go with it.
- Any change to route guards. `RequireAuth`/`RequireRole` logic is untouched; they simply observe a store
  that is now populated at boot.
- "Session expiring soon" warnings or countdown UI.

## Decisions

### D1: Split storage — `sessionStorage` when not remembered, `localStorage` when remembered

A single key (`abra.session`) holding `{ user, token, expiresAt }`, written to exactly one of the two
storages. On boot, read `sessionStorage` first, then fall back to `localStorage`.

This makes the checkbox mean what users expect it to mean: unchecked keeps you signed in through a reload
but not past closing the tab; checked survives a browser restart. Both cases fix the reload bug.

*Alternatives considered:* **`localStorage` for both, differing only in JWT expiry** — simpler, but then
leaving the box unchecked still writes a session to disk, which misrepresents the control. **httpOnly
refresh cookie + short in-memory access token** — the genuinely XSS-resistant design, and it would give us
revocation for free, but it requires a `Session` table and migration, a `/auth/refresh` endpoint, CORS
credentials, and cookie configuration across Docker and production. That is a larger architectural change
than this subtask, and it couples the frontend and backend work into one sequential thread. Deferred, and
worth revisiting alongside the revocation ticket below.

### D2: Absolute expiry, set once at login

The deadline is fixed when the token is signed and does not move with activity. `jsonwebtoken`'s
`expiresIn` already does exactly this, and `apiClient`'s 401 handler already covers the lapse — so this
decision costs zero new machinery on either side.

*Alternative considered:* **sliding expiry**, which is friendlier to someone working a long day, but needs
either token re-issue on every authenticated response (plus frontend plumbing to swap the new token in) or
a refresh endpoint. The cost is not justified while the default lifetime is 8 hours, which already covers a
working day.

### D3: Lifetimes as validated env config, in seconds, with safe defaults

```
JWT_EXPIRES_IN_SECONDS=28800              # 8 hours  — default session
JWT_REMEMBER_ME_EXPIRES_IN_SECONDS=2592000 # 30 days — "Remember me" session
```

Both are `z.coerce.number().int().positive()` with the above values as **defaults**, so no deployment has
to be touched for this to ship (see Migration Plan). Seconds rather than `jsonwebtoken`'s `"8h"`/`"30d"`
string format: an integer is trivially validated and unambiguous, whereas validating the string format
means either a regex approximating a third-party parser or accepting unvalidated input into token signing.
`.env.example` carries the human-readable equivalent in a comment.

`env.ts` adds a `.refine()` asserting `JWT_REMEMBER_ME_EXPIRES_IN_SECONDS >= JWT_EXPIRES_IN_SECONDS`, so a
misconfiguration that makes "remember me" *shorter* fails at boot rather than silently degrading. This is
the spec scenario "Login with rememberMe … longer than the short one" enforced at the config layer.

### D4: `rememberMe` on the existing login body, not a separate endpoint or header

`loginBodySchema` gains `rememberMe: z.boolean().optional().default(false)`. Zod's `.default(false)` gives
the non-breaking guarantee for free — existing callers that omit it keep today's 8-hour behavior — and it
rejects non-boolean values with the standard 400, satisfying the "Malformed rememberMe value" scenario
without extra code.

The flag threads `controller → service`, and `login()` picks the lifetime. It must **not** be written into
the JWT payload: the payload stays `{ sub, role }`. `rememberMe` is a property of the session's duration,
not a claim about the caller, and putting it in the payload would invite code that grants behavior based on
it — which the spec explicitly forbids ("rememberMe does not widen access").

### D5: The backend returns `expiresAt`; the frontend never parses the JWT

`LoginResult` gains `expiresAt` (ISO 8601 string) alongside `token` and `user`. The frontend persists it
and compares it against the current time on boot to decide whether to rehydrate.

The alternative is for the client to base64url-decode the JWT's `exp` claim. That works, but it makes the
frontend a consumer of the token's internal structure for no real gain, and hand-rolled base64url decoding
is an easy place to introduce a bug. An explicit field is one line of backend code and keeps the token
opaque to the client.

The stored `expiresAt` is a **hint, not an authority**. A user who edits it in devtools only causes an
expired token to be sent and rejected with 401. The server remains the sole enforcer; this check exists
purely to avoid rendering a logged-in shell that immediately bounces to `/login`.

### D6: Manual persistence in `sessionStore`, not Zustand's `persist` middleware

`persist` binds its storage at store-creation time, but which storage we use is decided per login. Working
around that means swapping the middleware's storage adapter at runtime, which is more indirection than the
three explicit calls this needs. `setSession(user, token, expiresAt, rememberMe)` writes; `clearSession()`
removes the key from **both** storages; a new `rehydrateSession()` reads at boot.

`clearSession()` clearing both storages unconditionally is what makes the "Remembered session ended, then a
non-remembered login" scenario hold — otherwise a stale `localStorage` entry could outlive the session that
replaced it.

### D7: Rehydration is synchronous, before the router mounts

Both `sessionStorage` and `localStorage` are synchronous APIs, so `rehydrateSession()` can run in
`main.tsx` before `createBrowserRouter`'s tree renders. That means **no loading state and no flicker**: by
the time `RequireAuth` first evaluates `token`, the store is already correct. This is why the design avoids
any async storage layer — introducing one would force a hydration-pending state into every guard.

Storage access is wrapped in `try/catch`. Safari's private mode and some hardened configurations throw on
`localStorage` access rather than returning null; a throw must degrade to "no persistence, session lasts as
long as the page" and never break login or app boot.

### Work split for parallel implementation

The contract frozen above — `rememberMe` in, `expiresAt` out, lifetimes from config — is the *entire*
interface between the two halves. There is no file overlap, so these can be implemented concurrently:

| Track | Scope | Files |
|---|---|---|
| **Backend** | D3, D4, D5 | `backend/src/config/env.ts`, `types/auth.schema.ts`, `services/auth.service.ts`, `controllers/auth.controller.ts`, `routes/auth.routes.ts` (OpenAPI), `routes/test/auth.routes.test.ts`, `.env.example` |
| **Frontend** | D1, D6, D7 | `frontend/src/services/{sessionStore,auth}.ts`, new storage adapter module, `pages/Login.tsx`, `pages/Login.schema.ts`, `main.tsx`, tests |

The frontend track can proceed against the contract before the backend lands, since `expiresAt` and
`rememberMe` are fully specified here. Integration is a single end-to-end check of the three lifetime cases
once both are merged.

## Risks / Trade-offs

- **A remembered token sits in `localStorage`, readable by any XSS on the page** → Accepted, and standard
  for this architecture. Narrowed by keeping the non-remembered default in `sessionStorage` and by the
  30-day cap. The httpOnly-cookie design in D1 is the real fix and is the natural follow-up.
- **Known limitation — deactivating a user does not end their session.** `login()` checks `isActive`, but
  `auth.middleware.ts` never re-checks it, and a stateless JWT cannot be revoked. Today's exposure is at
  most 8 hours; with a 30-day remembered token it becomes up to 30 days of continued API access for a
  deactivated employee. **This change knowingly widens an existing hole.** Mitigation: file a follow-up
  Jira subtask under SCRUM-58 to either re-check `isActive` in the middleware (one DB read per
  authenticated request) or introduce real revocation. Deployments that consider the 30-day window
  unacceptable can lower `JWT_REMEMBER_ME_EXPIRES_IN_SECONDS` without a code change — which is a further
  argument for D3.
- **"Remember me" on a shared machine keeps the next person signed in for 30 days** → Mitigated by
  defaulting the checkbox to unchecked, so the durable choice is always deliberate.
- **Client clock skew makes the boot expiry check wrong** → Harmless in both directions. A skewed-fast
  clock discards a still-valid session (user logs in again); a skewed-slow clock rehydrates a dead one and
  the first API call 401s into the existing handler. The server is authoritative either way.
- **`expiresAt` and the JWT's real `exp` could drift apart** if someone later changes the signing call
  without updating the returned field → Mitigated by deriving both from the same configured value in a
  single place in `login()`, and by a test asserting the returned `expiresAt` matches the decoded token's
  `exp`.

## Migration Plan

1. **No coordinated deploy required.** Both env vars have working defaults (D3), so the backend runs
   unchanged if nothing is set. `.env.example`, `docker-compose.yml`, and CI env need no edits to keep
   working — `.env.example` is updated for documentation only.
2. **Deploy order does not matter.** `rememberMe` defaults to `false`, so a new frontend against an old
   backend degrades to today's 8-hour token (persistence still works and the reload bug is still fixed),
   and an old frontend against a new backend behaves exactly as before.
3. **Rollback** is a plain revert. Sessions already written to `localStorage`/`sessionStorage` become inert
   residue that a reverted frontend never reads; users land back on the pre-change behavior of losing the
   session on reload. Worth clearing the key on the next change that touches storage, but harmless.
