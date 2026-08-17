## 1. Schema and migration (SCRUM-197)

- [x] 1.1 Add `sessionsValidFrom DateTime @default(now())` to `model User` in `backend/prisma/schema.prisma`, with a comment explaining that it is the revocation boundary and that only an explicit logout moves it forward
- [x] 1.2 Generate the migration, then hand-edit it to backfill existing rows to `now() - interval '30 days'` (older than any live remember-me token) instead of the migration timestamp — see design.md Migration Plan step 1; deploying with the default would log out every current user
- [x] 1.3 Run the migration against the dev database and confirm existing seeded users have a backdated `sessionsValidFrom` while a newly created user gets `now()`

## 2. Token contract (SCRUM-197)

- [x] 2.1 Add `iat: number` as a required field on `JwtPayload` in `backend/src/types/auth.ts`, documenting that the revocation gate depends on it
- [x] 2.2 In `auth.service.ts` `login`, keep `jwt.sign` emitting `iat` but assert it is present on the signed result so the claim is part of the contract rather than a library default (D6)
- [x] 2.3 Confirm `login` does **not** write `sessionsValidFrom` — signing in must not end the account's other sessions

## 3. Revocation gate in `authenticate` (SCRUM-197)

- [x] 3.1 After the existing user-row read in `backend/src/middleware/auth.middleware.ts`, reject a token whose `iat` is missing with the generic invalid-token `401` (D3)
- [x] 3.2 Add the boundary comparison at second precision: reject when `payload.iat < Math.floor(user.sessionsValidFrom.getTime() / 1000)` with `new AppError(401, 'SESSION_REVOKED', 'Session has ended')` (D2, D4)
- [x] 3.3 Comment the second-precision trade-off inline — why the boundary is floored, and that a token minted in the same wall-clock second as the logout deliberately survives so that immediate re-login works
- [x] 3.4 Verify the gate runs after the `isActive` check and before `req.user` is attached, and that no second database lookup was introduced

## 4. Logout endpoint (SCRUM-195)

- [x] 4.1 Add `logout(userId)` to `backend/src/services/auth.service.ts`, setting `sessionsValidFrom` to `new Date()` via `prisma.user.update`
- [x] 4.2 Add `postLogout` to `backend/src/controllers/auth.controller.ts` — take the id from `req.user.sub` only, never the body, and respond `204` with no content
- [x] 4.3 Register `POST /logout` in `backend/src/routes/auth.routes.ts` — unprefixed to match `/login` and `/me/password`, with `logoutRateLimit` mounted *ahead* of `authenticate` so the token verify and user-row read sit behind the limiter (D5)
- [x] 4.4 Write the OpenAPI block for the route: `204`, `401` for missing/expired/revoked token, `429` with `Retry-After`, bearer security

## 5. Backend tests (SCRUM-201)

- [x] 5.1 Rework `backend/src/middleware/test/auth.middleware.test.ts` so every signed token carries a plausible `iat`; per D7, drive revocation cases by moving the user's `sessionsValidFrom` forward rather than backdating `iat`, to avoid producing an already-expired token that fails the wrong gate
- [x] 5.2 Add middleware tests: token issued before the boundary is `401 SESSION_REVOKED`; token issued after it proceeds; token with no `iat` is `401`; authenticating again leaves an earlier token working
- [x] 5.3 Add route tests in `backend/src/routes/test/auth.routes.test.ts`: successful logout returns `204`; reusing that token on a protected endpoint returns `401 SESSION_REVOKED`; logout with no token returns `401`
- [x] 5.4 Add a test that logout revokes a *second* token from a separate login for the same user (global revocation, D1)
- [x] 5.5 Add a test that a body-supplied user id is ignored — another account's token still works after a caller logs out naming it
- [x] 5.6 Add a test that logging in again after logout yields a working token while the pre-logout token stays refused
- [x] 5.7 Run the backend suite and confirm no pre-existing test regressed from the `iat` requirement
- [x] 5.8 Add tests for `logoutRateLimit`: the quota is spent by *tokenless* calls (proving the limiter precedes `authenticate`), passing it answers `429` with `Retry-After`, a valid-token caller is throttled too, and a logout inside the quota still returns `204`

## 6. Frontend logout call and teardown (SCRUM-195, SCRUM-196, SCRUM-198)

- [x] 6.1 Add `logout()` to `frontend/src/services/auth.ts` calling `POST /logout` with `handleUnauthorizedGlobally: false`, so a `401` from an already-revoked token does not trigger a spurious "Session Expired" toast (D8)
- [x] 6.2 Add a `logoutAndRedirect` flow that awaits the server call in a `try`, swallows any failure, and performs teardown in a `finally`: `clearSession()`, `queryClient.clear()`, then `redirectToLogin()` (D8)
- [x] 6.3 Confirm `queryClient.clear()` is included — without it the next user on the same browser can be served the previous user's cached data on first render
- [x] 6.4 Ensure the post-logout redirect does not preserve the previous path for return after the next login

## 7. Expiry timer (SCRUM-199)

- [x] 7.1 Add a module-level timer in `frontend/src/services/sessionStore.ts` armed from the session's `expiresAt`, not a React effect — `rehydrateSession()` runs before React mounts, and there is precedent against setState-in-effect countdowns (D9)
- [x] 7.2 Arm it from both `setSession` and `rehydrateSession`; clear it in `clearSession` so a stale timer cannot log out a later session
- [x] 7.3 Clamp long delays and re-arm in chunks — a 30-day remember-me lifetime overflows `setTimeout`'s 32-bit delay and would otherwise fire immediately, logging remembered users out at boot (D9)
- [x] 7.4 On fire, clear the session, show the existing session-expired notice, and redirect to `/login`; leave `apiClient`'s reactive 401 handling in place as the clock-skew backstop

## 8. Cross-tab sync (SCRUM-200)

- [x] 8.1 Register a `storage` listener alongside the session store that ends this tab's session when the `abra.session` key is removed from `localStorage` (D10)
- [x] 8.2 React only to removal (`newValue === null`) for that key — a login in another tab writes it, and treating a write as a signal would break "logging in does not disturb an unrelated tab's session"
- [x] 8.3 On a cross-tab wake, tear down locally and redirect without calling `POST /logout` — the session is already revoked server-side
- [x] 8.4 Confirm behaviour degrades to no-op when storage is unavailable, leaving the requesting tab correct

## 9. Logout control (SCRUM-194)

- [x] 9.1 Add a fourth entry to the `Menu` `items` in `frontend/src/pages/Layout.tsx` labelled `התנתקות`, using `onClick` rather than a `Link` since it performs an action
- [x] 9.2 Give it a key that can never equal a `pathname` so it does not render as the selected route
- [x] 9.3 Push it to the far end of the horizontal menu and verify it reads correctly under the global RTL `ConfigProvider`
- [x] 9.4 Verify it is keyboard focusable and activatable, inheriting the menu's focus handling

## 10. Frontend tests (SCRUM-201)

- [x] 10.1 Test the control renders in `Layout` and invokes the logout flow when activated
- [x] 10.2 Test teardown on a failing server call: session cleared, cache cleared, redirect performed, no blocking error
- [x] 10.3 Test the expiry timer ends the session with no user interaction, and that `clearSession` cancels a pending timer
- [x] 10.4 Test the `storage` listener ends the session on key removal and ignores a key write
- [x] 10.5 Test that a session cleared in one tab leaves no persisted copy in either storage
- [x] 10.6 Run the frontend suite; per project convention, fix real logic or timing issues rather than weakening assertions

## 11. Verification

- [x] 11.1 Run `openspec validate --strict user-logout` and resolve any findings
- [x] 11.2 Manually verify end to end: log in, log out, confirm the login page and that the back button reveals no authenticated content
- [x] 11.3 Manually verify two tabs with a remembered session: logging out in one ends the other
- [ ] 11.4 Manually verify the captured-token case — copy a token, log out, confirm it is refused with `SESSION_REVOKED`
- [x] 11.5 Confirm the Swagger page documents the new route and its `401`/`429` codes
