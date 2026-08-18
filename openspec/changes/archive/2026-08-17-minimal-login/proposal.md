## Why

SCRUM-61 (Admin Creates User Account, under the Auth epic SCRUM-4) includes SCRUM-209 "Force password change on first login". That requirement is meaningless without an actual login flow, but SCRUM-58 (User Login, same epic) has not been built by anyone: `Login.tsx` is a placeholder that fakes a session with two buttons, and there is no backend login endpoint at all — `backend-foundation`'s `auth-middleware` spec explicitly deferred token *issuance* to "the Auth epic".

This change delivers just enough of SCRUM-58 for SCRUM-209 to be real: a working `POST /login` and a `PATCH /me/password`, wired into a real frontend Login screen and a new forced "set a new password" screen. It is not the full SCRUM-58/59/60 scope (no "remember me", no dedicated invalid-login-attempt story, no logout beyond clearing the existing session store) — those remain separately scoped stories under the Auth epic.

## What Changes

- **Prisma**: `User.mustChangePassword` (boolean, default `true`) — new migration
- **Backend**: `POST /login` (email + password → JWT + profile, rejects wrong credentials and inactive accounts identically) and `PATCH /me/password` (authenticated; sets a new password and clears `mustChangePassword`, no old-password check since a temp-password holder has nothing else to prove)
- **Frontend**: real `Login.tsx` (react-hook-form + zod + antd, replacing the two-button placeholder), new `ChangePassword.tsx` screen at `/change-password`, and `RequireAuth` extended to redirect there whenever the session's `mustChangePassword` is true — so the gate can't be dodged by navigating to another protected route directly
- **`apiClient.request()`**: new opt-out `handleUnauthorizedGlobally` flag, so `POST /login`'s own 401 (wrong password) doesn't trigger the existing "your session expired, redirecting to /login" global handler while already on the login page

### Non-goals

- Full SCRUM-58/59/60 scope (session refresh, dedicated invalid-login UX beyond an inline error, logout flow beyond existing session clearing)
- Admin-side user creation itself — that's the rest of SCRUM-61, built on top of this

## Capabilities

### New Capabilities

- `backend/login-endpoint`: Password-based authentication issuing the JWTs that `auth-middleware` already verifies, plus self-service password change for the forced-change flow

### Modified Capabilities

- `frontend-auth-routing`: `RequireAuth` gains a second gate beyond "has a token" — a session with `mustChangePassword: true` is redirected to `/change-password` instead of rendering the requested route
