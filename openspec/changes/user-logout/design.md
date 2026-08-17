## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **Auth is stateless HS256, payload `{ sub, role }`**, signed in `auth.service.ts` with `expiresIn`. There
  is no `Session` or `RefreshToken` table. `jsonwebtoken` adds an `iat` claim automatically unless
  `noTimestamp` is set, but nothing in the codebase depends on it yet and the `JwtPayload` type does not
  declare it.
- **`authenticate` already reads the caller's user row on every authenticated request**, added by
  `revoke-sessions-deactivated-users` to make deactivation bite mid-session. This is the decisive constraint:
  a per-user revocation boundary stored on that row is free, while any per-token mechanism adds a lookup.
- **That change explicitly deferred voluntary revocation to this one**, naming two candidates — per-session
  rows or a per-user epoch — and declining to choose. It also predicted that its `isActive` check would fold
  into whatever session read this change introduced; with a per-user epoch there is no new read to fold into,
  which is better than predicted.
- **Token lifetimes are 8 hours, or 30 days with remember-me** (`JWT_EXPIRES_IN_SECONDS`,
  `JWT_REMEMBER_ME_EXPIRES_IN_SECONDS`). The exposure this change closes is that full 30 days.
- **`AppError` carries `{ status, code, message }`** and is serialised once by the error middleware.
  `TOKEN_EXPIRED` and `ACCOUNT_DEACTIVATED` are both built inline as `new AppError(401, 'CODE', …)` rather
  than via static factories.
- **The frontend session lives in a Zustand store** (`sessionStore`) plus a `localStorage`/`sessionStorage`
  copy under one key, `abra.session`. `rehydrateSession()` is called from `main.tsx` at module scope, outside
  React, and `apiClient` reads the token via `getState()` — so session lifecycle code cannot assume a React
  render or a hook context.
- **`apiClient` already handles 401 globally**: clears the session, toasts "Session Expired", and redirects
  via `navigation.ts`'s `window.location.href` shim. Expiry today is detected only reactively, on the next
  request, or at boot by `isValidStoredSession`.
- **`Layout.tsx` is the shared shell** for authenticated routes: an antd `Menu mode="horizontal"` with Hebrew
  labels, inside a global `ConfigProvider direction="rtl"`.
- **React Query's cache is a module-level singleton** (`queryClient.ts`), not scoped to a session, so it
  outlives a logout unless explicitly cleared.

## Goals / Non-Goals

**Goals:**

- A token the user has logged out of stops working, at any token age, without adding a per-request query.
- Teardown that cannot be defeated by a failing network — asking to log out always logs you out locally.
- Expiry noticed while a tab sits idle, not only when something happens to call the API.
- Leave `revoke-sessions-deactivated-users` intact rather than reworking it.

**Non-Goals:**

- Per-device revocation ("log out my other devices" as a distinct action from logout). The mechanism chosen
  makes logout global by construction; scoping it per device is D1's rejected alternative.
- Refresh tokens, a token-rotation scheme, or httpOnly cookies. The session model stays exactly as it is.
- Revocation on password change, even though `sessionsValidFrom` would make it a one-line addition. It is a
  different ticket with its own acceptance criteria, and adding it silently here would surprise users mid-
  session.
- Idle-inactivity logout, and any "you are about to be logged out" warning (settled with the user).
- A logout confirmation dialog. Logout is cheap to undo by logging back in.
- Server-side audit of logout events. `LoginAttempt` records credential attempts; extending it to session
  ends is not asked for here.

## Decisions

### D1: Revoke with a per-user `sessionsValidFrom` epoch, not per-token rows

Add `sessionsValidFrom DateTime @default(now())` to `User`. Logout sets it to `now()`. `authenticate`, after
its existing row read, rejects any token whose `iat` predates it.

```
model User {
  ...
  sessionsValidFrom DateTime @default(now())
}
```

The reason this wins here is narrow and specific: **`authenticate` already fetches the user row.** The
revocation check therefore costs one column on a row already in hand — no new table, no second query, no
join, no purge job for expired rows. Every other mechanism costs strictly more for a product whose whole user
base is one company's headcount.

The price is that logout is **global to the account**: logging out on a phone ends the laptop session too.
For an internal time-reporting tool this is defensible and arguably the safer default — a user who logs out
because they think their token leaked almost certainly wants every session gone, and that is the one case
where the distinction matters most.

*Alternatives considered:*

- **A `jti` denylist / `Session` table** — the textbook answer, and the only one that scopes logout to the
  device that asked. Rejected on cost/benefit: it needs a new table, a `jti` in every token, a lookup per
  request that the epoch avoids entirely, and a scheduled purge of rows past their expiry (without which the
  table grows without bound). All of that buys a property — per-device scoping — that nobody has asked for
  and that is the less safe default for the leaked-token case. Revisit if per-device session management ever
  becomes a real requirement; migrating epoch → sessions later is additive and does not invalidate anyone.
- **Shortening token lifetimes instead** — reduces the window without a logout mechanism at all, but does
  not end a session on request, and directly undoes SCRUM-181's 30-day remember-me. Not a substitute.
- **Client-side-only logout** — offered to the user and declined. A copied token would keep working for up
  to 30 days, which is the exposure SCRUM-197 exists to close.

### D2: Compare at second precision, flooring the boundary, and fail open for under a second

`iat` is seconds since the epoch — the JWT spec gives no finer resolution — while `sessionsValidFrom` is a
millisecond `DateTime`. Comparing them naively breaks in a way worth being explicit about, because both
obvious readings are wrong:

| Comparison | Pre-logout token, same second | Login immediately after logout |
|---|---|---|
| `iat * 1000 < sessionsValidFrom` | rejected ✓ | **rejected ✗** |
| `iat < ceil(sessionsValidFrom / 1000)` | rejected ✓ | **rejected ✗** |
| `iat * 1000 < floor(sessionsValidFrom to second)` | accepted ✗ | accepted ✓ |

Logout at `T=10.400s` writes `sessionsValidFrom = 10.400`. A token minted at `10.600` — a legitimate login
*after* the logout — still carries `iat = 10`, indistinguishable from one minted at `10.200`. There is no
comparison that rejects the second and accepts the third.

We take the third row: floor the boundary to its second and reject only strictly-older tokens.

```ts
const boundarySeconds = Math.floor(user.sessionsValidFrom.getTime() / 1000);
if (payload.iat < boundarySeconds) { /* reject SESSION_REVOKED */ }
```

This means a token issued in **the same wall-clock second as the logout** survives it — a sub-second
fail-open window. Chosen deliberately over the alternative, which is that logging back in within the same
second as logging out hands you a token that is instantly refused. That would be a reproducible,
user-visible bug on a fast double-click; the sub-second window is not reachable by an attacker who does not
already control the timing of the victim's logout, and it replaces a 30-day exposure with a one-second one.

*Alternative considered:* **store the boundary as an integer second column** rather than a `DateTime`. Same
arithmetic, one fewer conversion, but it gives up a human-readable timestamp for operators and diverges from
every other temporal column in the schema. Not worth it.

### D3: A token with no `iat` is refused

`jsonwebtoken` adds `iat` automatically, so every token this service issues has one. A token without it can
only come from something hand-rolling a payload — in practice, tests (`auth.middleware.test.ts` signs its
own). Treating a missing `iat` as "cannot be older than the boundary, so allow" would mean a token that is
unattributable in time is also unrevocable, which inverts the guarantee. `JwtPayload` gains `iat: number` as
a required field and the middleware rejects its absence as an invalid token.

The consequence is that tests signing bare payloads must stop doing so — see D7.

### D4: `SESSION_REVOKED` as a third 401 code, status 401 not 403

`new AppError(401, 'SESSION_REVOKED', 'Session has ended')`, built inline like its two siblings.

`401` rather than `403` for the same reason `ACCOUNT_DEACTIVATED` is a 401: the caller has no usable
identity, and a `403` would tell `apiClient`'s global handler to leave the dead session in place. The
distinct code lets the frontend say "your session was ended" instead of "Session Expired", which would be
inaccurate here — and, more usefully, lets a tab distinguish *another tab logged us out* from *our token
aged out*, which D9 uses.

### D5: `POST /logout`, `204`, no body, identity from the token only

Mounted on `authRouter`, which has no prefix — so `POST /logout`, alongside `/login` and `/me/password`.
SCRUM-195 writes it as `/auth/logout`; matching the existing routes matters more than matching the ticket's
prose, and the deviation is noted in the proposal.

Behind `authenticate`, so an unauthenticated or already-revoked caller gets the ordinary `401` and the
handler never runs. The user id comes from `req.user.sub` and nothing else — accepting an id from the body
would be a way to log out other people. `204` with no body: there is nothing to report, and the client's
teardown does not depend on the response content.

No rate limiting. The endpoint requires a valid token, is idempotent, and writes one row — the
`rateLimit` middleware exists to protect credential endpoints from guessing, which does not apply.

*Alternative considered:* **`DELETE /session`** — arguably more RESTful, but there is no session resource in
this API to delete, and `POST /logout` is what the rest of the codebase's verb-ish auth routes look like.

### D6: `login` stops relying on an implicit `iat` and does not touch the boundary

`jwt.sign` already emits `iat`; the change is to declare it in `JwtPayload` and to have the login path assert
it exists, so the claim the new gate depends on is part of the contract rather than a library default that a
future option flag could silently remove.

**Login deliberately does not stamp `sessionsValidFrom`.** Rotating the epoch on login would mean signing in
on a second device kicks you off the first — a much more disruptive behavior than the one D1 accepts, and not
something any requirement asks for.

### D7: `auth.middleware.test.ts` must be reworked, again

That file signs its own payloads. `revoke-sessions-deactivated-users` already had to rework it once, to
create real user rows instead of fabricated subjects; this change requires the tokens it signs to carry a
plausible `iat` and, for the revocation cases, to be signed with an `iat` deliberately before or after a
boundary the test sets on the user row. Mechanical, but it is real work and belongs in tasks rather than
being discovered mid-implementation.

Setting `iat` explicitly in a test means passing it in the payload and *not* using `expiresIn` together with
a manual `iat` carelessly — `jsonwebtoken` computes `exp` from `iat` when both are present, so a test that
backdates `iat` by more than the token lifetime produces an already-expired token and fails the wrong gate.
Tests for the revocation gate should backdate the boundary forward instead of backdating the token.

### D8: Client teardown is unconditional; the server call is best-effort

```
logout():
  try { await POST /logout }        // best-effort
  catch { /* swallow */ }
  finally {
    clearSession()                  // both storages + memory
    queryClient.clear()             // cached data from this session
    redirectToLogin()
  }
```

The `finally` is the whole point: a user on a shared machine who loses their network must still end up logged
out locally. Swallowing the error is safe because the only thing lost is server-side revocation of a token
that the client is about to forget — and if that token was never revoked, it expires on its own schedule,
which is exactly the status quo before this change.

Two details that are easy to get wrong:

- **`queryClient.clear()` is required**, not optional tidiness. The cache is a module singleton; without
  clearing it, the next user to log in on the same browser can be served the previous user's cached time
  reports on first render, before refetch completes. That is the "cached data does not outlive the session"
  scenario in the spec.
- **The call must be issued with `handleUnauthorizedGlobally: false`.** Otherwise a `401` from logout itself
  (a token already revoked in another tab) would trigger `apiClient`'s global handler and show a spurious
  "Session Expired" toast on top of a deliberate logout.

### D9: Expiry timer armed at the two places a session begins, not in a React effect

A single module-level timer in `sessionStore`, set whenever a session is established (`setSession`) or
restored (`rehydrateSession`), and cleared by `clearSession`:

```
armExpiry(expiresAt):
  clearTimeout(current)
  delay = new Date(expiresAt) - Date.now()
  if (delay <= 0) return expireNow()
  current = setTimeout(expireNow, delay)
```

Deliberately **not** a `useEffect` in a component. `rehydrateSession()` runs in `main.tsx` before React
mounts, `apiClient` already reads the store from outside React, and a countdown owned by a component would
re-arm on every remount and die with it. There is also direct precedent for avoiding this shape:
`8568644 fix: avoid setState-in-effect for the login lockout countdown`.

`clearSession` clearing the timer is what makes the spec's "logging out cancels the pending expiry" scenario
hold — otherwise a stale timer fires later and toasts "session expired" at a user who is already on the
login page, or worse, at a *different* user who has since logged in.

`setTimeout` with a delay beyond ~24.8 days overflows a 32-bit signed int and fires immediately, which a
30-day remember-me token will hit. The timer must therefore clamp long delays and re-arm in chunks rather
than scheduling the full duration in one call.

Reactive 401 handling in `apiClient` stays exactly as it is, as the backstop for a client clock behind the
server's.

### D10: Cross-tab sync via the `storage` event on the existing key

`clearSession` already removes `abra.session` from both storages. `localStorage` removals fire a `storage`
event in every *other* tab of the same origin for free — no new key, no `BroadcastChannel`, no message
protocol. A single listener registered alongside the store treats "`abra.session` was removed" as "end this
tab's session too".

Consequences worth stating:

- **This covers remembered (`localStorage`) sessions only.** `sessionStorage` is per-tab, so two tabs cannot
  share a non-remembered session in the first place — there is nothing to propagate. The requirement is
  satisfied for every case where it is meaningful.
- **The event fires only in other tabs**, never the one that wrote, so there is no self-notification loop to
  guard against.
- **The listener must ignore writes**, reacting only to removal (`event.newValue === null`) for the session
  key. A login in another tab writes the key; treating that as a signal would log out the tab that is
  already fine, breaking "logging in does not disturb an unrelated tab's session".
- **A tab woken this way must not call `POST /logout`.** The session is already revoked server-side; calling
  again would just earn a `401`. It clears locally and redirects.
- Where storage is unavailable entirely, no event is possible and the spec explicitly only requires the
  requesting tab to work.

*Alternative considered:* **`BroadcastChannel`** — a cleaner API and it would work for same-origin tabs
regardless of storage. Rejected because it needs a new channel and message vocabulary to replicate a signal
`clearSession` already emits as a side effect, and because storage being unavailable is already an accepted
degradation.

### D11: The logout control goes in `Layout.tsx`'s existing `Menu`

`Layout` is the shell for authenticated routes, so a control placed there is present on every protected page
and absent on `/login` without any conditional logic. It becomes a fourth `items` entry — Hebrew label
`התנתקות`, pushed to the far end of the horizontal menu — rather than a bespoke button, so it inherits the
menu's keyboard handling, focus ring, and RTL direction from the global `ConfigProvider`.

Since the item performs an action rather than navigating, it takes an `onClick` and no `Link`, and must not
participate in `selectedKeys` — its key must never match `pathname`, or it would render as the active route.

## Risks / Trade-offs

- **Logout ends sessions on all the user's devices** (D1) → Accepted and documented; it is the safer default
  for the leaked-token case and this is an internal tool. If per-device logout is ever wanted, a `Session`
  table is additive over this design and invalidates no existing token.
- **A token minted in the same second as a logout survives it** (D2) → Accepted: a one-second fail-open
  window replacing a thirty-day one, not reachable by an attacker who does not already control the victim's
  logout timing. The alternative is a reproducible bug on fast re-login.
- **Every token now depends on an `iat` claim** (D3) → Real tokens always have one; only hand-rolled test
  payloads break, and fixing them is in scope (D7). No production token is affected.
- **A user's own stale tab can log them out of a fresh session** if the expiry timer is not cleared → This is
  precisely why `clearSession` owns the timer (D9). Called out because the failure is silent and would
  present as a random logout.
- **`setTimeout` overflow at 30-day remember-me lifetimes** (D9) → Must clamp and re-arm; unhandled it fires
  instantly and logs remembered users out at boot, which would be a severe regression rather than a subtle
  one.
- **Cross-tab sync does not cover non-remembered sessions** (D10) → Not a gap: `sessionStorage` is per-tab,
  so no two tabs share such a session.
- **A logout whose server call silently failed leaves a live token** (D8) → Bounded by the token's natural
  expiry, identical to today's behavior, and the user is locally logged out either way. Making teardown
  conditional on the call instead would be strictly worse.
- **The frontend gains a second reason to end a session, so "why am I on the login page?" has more possible
  answers** → Mitigated by `SESSION_REVOKED` being distinct (D4), which lets the message name the actual
  cause instead of always claiming expiry.
- **`sessionsValidFrom` invites scope creep** — password-change revocation and "log out everywhere" both
  become trivial → Explicitly out of scope; each needs its own acceptance criteria.

## Migration Plan

1. **Migration adds `sessionsValidFrom DateTime @default(now())` to `users`.** Existing rows are stamped with
   the migration's execution time. Because `authenticate` rejects only tokens issued *strictly before* the
   boundary, and every live token was necessarily issued before the migration ran, this would log out every
   current user at deploy time — so the column is added with a **backfill to a timestamp before the oldest
   possible live token** (`now() - JWT_REMEMBER_ME_EXPIRES_IN_SECONDS`, i.e. 30 days) rather than to `now()`.
   The `@default(now())` applies to newly created users, for whom it is correct.
2. **Deploy backend before frontend.** The backend is additive: `POST /logout` simply exists unused, and the
   new gate cannot fire until something calls it. An unchanged frontend keeps working.
3. **Then deploy the frontend.** Its logout call, expiry timer, and cross-tab listener are all inert against
   an older backend except the endpoint call, and D8's best-effort handling means a `404` from a not-yet-
   deployed backend still logs the user out locally.
4. **Rollback** is a plain revert of both, in the reverse order. Reverting the backend leaves
   `sessionsValidFrom` populated and simply unread, so previously logged-out tokens become valid again for
   whatever remains of their lifetime — the pre-change behavior. Dropping the column is a separate, optional
   follow-up and is not required for rollback.
