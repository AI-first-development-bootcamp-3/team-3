## Why

The change-password page is a dead end. A user reaches it from the user menu, and once there the only
control on the screen is "שמירת סיסמה" — there is no way to abandon the change and get back to work
without using the browser's own Back button or re-typing a URL. Anyone who opens the page by mistake, or
changes their mind, is stuck on a form they did not intend to submit.

## What Changes

- Add a "back" control to the change-password page that returns the user to their home route without
  submitting the form: `/admin` for an admin session, `/` for a regular session (the existing
  `homePath(user)` rule).
- The control is always available on the page, including while a submit is in flight, and never submits
  the form or mutates the password.
- No change to the save path, the validation schema, or the change-password API.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-auth-routing`: adds a requirement that the change-password page offers a non-destructive exit
  to the session's home route. The route itself, its auth guard, and the save behaviour are unchanged.

## Impact

- `frontend/src/pages/ChangePassword.tsx` — the only code file that changes.
- `frontend/src/pages/ChangePassword.test.tsx` — new coverage for the back control.
- Reuses `homePath()` from `frontend/src/services/authPaths.ts`; no new module, dependency, or route.

### Assumption recorded

The existing requirement "Forced password change blocks other protected routes" in
`openspec/specs/frontend-auth-routing/spec.md` describes pinning a `mustChangePassword: true` session to
`/change-password`. That guard is **not implemented** in the current frontend — `RequireAuth` only checks
for a session — and the user has confirmed the product no longer enforces a forced password change. This
change therefore treats every visit to the page as voluntary and shows the back control unconditionally.

Retiring that stale requirement is **out of scope here** and left as a separate change, so this proposal
does not delete spec text it was not asked to touch.
