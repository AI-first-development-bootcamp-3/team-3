## Context

- This is `feat/SCRUM-58-minimal-login`, cut from `story-scrum61` (itself cut from `epic-auth`, cut from `development` after `epic-setup-infrasracture` merged into it) — full backend/frontend foundation is present.
- `auth-middleware` (already merged) verifies tokens and enforces roles, but explicitly does not issue them: "Issuing tokens at login is a separate concern owned by the Auth epic."
- `Login.tsx` is a placeholder (`fake-token-${user.id}`, two buttons) with a comment saying it's "replaced wholesale when real auth lands" — this change is that replacement, scoped narrowly to what SCRUM-209 needs.
- The frontend's `User.userType` is `'regular' | 'admin'`; the backend's `Role` enum is `ADMIN | EMPLOYEE`. These were never reconciled because no real login existed to cross the boundary.

## Goals / Non-Goals

**Goals:**
- A real, testable login endpoint and frontend screen
- `mustChangePassword` enforced end-to-end: set on account creation (default `true`), returned at login, checked by route guards, cleared by the password-change endpoint
- No dead-end: a user who must change their password cannot reach any other protected route first

**Non-Goals:**
- Full SCRUM-58/59/60 (remember-me, dedicated invalid-login-attempt UX, real logout beyond clearing local session state)
- Admin-side user creation (rest of SCRUM-61, later sprints on this same story branch)

## Decisions

### Map backend `Role` to frontend `UserType` in a small translation function, not by renaming either side
`frontend/src/services/auth.ts` owns a `ROLE_TO_USER_TYPE` map (`ADMIN → 'admin'`, `EMPLOYEE → 'regular'`) at the login response boundary.
*Alternatives considered:* **Rename frontend `UserType` to match backend's `ADMIN`/`EMPLOYEE`** — rejected: touches `RequireRole`, `routes.tsx`, and every existing test/callsite using `'admin'`/`'regular'` literals, for no behavioral gain over a four-line map at the one place the two vocabularies actually meet.

### `PATCH /me/password` has no old-password check
Its primary caller is a brand-new user handed a temp password out-of-band by an admin; they have nothing else to prove they know. The caller already holds a valid session JWT, which is the identity check.
*Risk accepted:* an attacker who steals a live session token could change the victim's password without knowing the old one — no worse than every other token-authenticated endpoint in this API, which all trust the token equivalently.

### `apiClient.request()` gets an opt-out flag instead of a parallel unauthenticated fetch helper
Every other endpoint's 401 genuinely means "your session died, go log in again," and that global handler (clear session, toast, redirect) is correct there. Only `POST /login` itself needs different semantics for its own 401 (wrong password, not an expired session). Adding `handleUnauthorizedGlobally?: boolean` (default `true`) to `RequestOptions` keeps one request path instead of two, and defaults to today's behavior for every existing caller.

### `RequireAuth` (not a new wrapper) enforces the forced-password-change redirect
It already owns "is this session allowed to see this route" for the `!token` case; `mustChangePassword` is the same question with a different destination (`/change-password` instead of `/login`). A separate `RequireFreshPassword` wrapper would need to be added to every existing protected route by hand, which is exactly the "dodge by navigating elsewhere" gap this change is closing.

## Risks / Trade-offs

**`mustChangePassword` on `User` is optional (`mustChangePassword?: boolean`)** rather than required, so existing code constructing a `User` without it (tests, in particular) still compiles. Any session missing it behaves as `false` (falsy) — acceptable since every real login response now always includes it explicitly.

## Migration Plan

1. Migration adds `mustChangePassword boolean not null default true` — existing seeded dev users get `mustChangePassword: false` explicitly in `seed.ts` so local dev logins aren't forced into the change-password screen.
2. No feature-flagging needed — this is new capability, not a change to existing request shapes handled elsewhere.

## Open Questions

None blocking.
