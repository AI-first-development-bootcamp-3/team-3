## Why

The login session is held only in an in-memory Zustand store, so **every page refresh silently logs the
user out** — the JWT's 8-hour lifetime is effectively "until you reload the tab". Employees filling in
daily reports lose their session on any refresh or accidental navigation, and there is no way to stay
signed in on a personal machine. SCRUM-181 is the last functional gap in the SCRUM-58 login story.

## What Changes

- Login accepts an optional `rememberMe` flag; the issued JWT's lifetime becomes 8 hours without it and
  30 days with it. Both lifetimes move out of the hardcoded `expiresIn: '8h'` call and into validated
  environment configuration.
- The frontend persists the session so it survives a page reload. Without `rememberMe` the token goes to
  `sessionStorage` (survives refresh, cleared when the tab closes); with it, to `localStorage` (survives
  a browser restart).
- On application boot the stored session is rehydrated into the session store. A token whose `exp` has
  already passed is discarded before rehydration, so the app never renders a logged-in shell that then
  bounces to `/login`.
- The login form gains a "Remember me" checkbox, unchecked by default.
- Expiry stays **absolute**: the deadline is fixed at login and does not extend with activity. An expired
  token is surfaced by the existing global 401 handler in `apiClient`, which already clears the session,
  toasts "Session Expired", and redirects to `/login`.

Not in scope, deliberately: sliding/renewing expiry, refresh tokens, and server-side token revocation.
See "Known limitation" in `design.md` — a long-lived token remains valid after an admin deactivates the
account, which needs its own ticket.

## Capabilities

### New Capabilities

- `frontend-session-persistence`: Where an authenticated session is stored between page loads, how it is
  rehydrated on boot, how the remembered and non-remembered cases differ, and when a stored session is
  discarded. No spec covers this today — the current in-memory-only behavior is undocumented and is the
  root cause of the refresh bug.

### Modified Capabilities

- `backend/login-endpoint`: The login request contract gains an optional `rememberMe` boolean, and the
  requirement now constrains the issued token's lifetime (8 hours default, 30 days when remembered)
  rather than leaving it unspecified.

## Impact

**Backend**
- `src/types/auth.schema.ts` — `rememberMe: z.boolean().optional().default(false)` on `loginBodySchema`
- `src/services/auth.service.ts` — `login()` takes the flag and picks the lifetime
- `src/controllers/auth.controller.ts` — forwards the flag
- `src/config/env.ts`, `.env.example` — two new validated duration variables
- `src/routes/auth.routes.ts` — OpenAPI request-body documentation
- `src/routes/test/auth.routes.test.ts` — lifetime assertions per case

**Frontend**
- `src/services/sessionStore.ts` — persistence + rehydration, `clearSession` must clear both storages
- New storage adapter module wrapping `sessionStorage`/`localStorage` (must tolerate `Storage` throwing
  in private-browsing modes)
- `src/services/auth.ts` — pass `rememberMe` through to `POST /login`
- `src/pages/Login.tsx`, `src/pages/Login.schema.ts` — the checkbox and its form value
- `src/main.tsx` — rehydrate before the router mounts
- Tests for the login page and the storage/rehydration logic

**No database migration, no new endpoints, no new runtime dependencies.** The two sides meet at exactly
one contract — the `rememberMe` field on the login request and the resulting token lifetime — which keeps
the backend and frontend work independently implementable.

**Compatibility:** non-breaking. `rememberMe` is optional and defaults to `false`, preserving today's
8-hour behavior for any existing caller; the frontend change only adds persistence where there was none.
