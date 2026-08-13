## Context

Builds on SCRUM-39's `sessionStore`. No real backend auth exists yet (Auth epic SCRUM-4 untouched) - a
placeholder `/login` page lets the guards be built and verified now without blocking on that epic.

## Goals / Non-Goals

**Goals:** redirect-to-login for protected routes, role restriction for Admin, both demonstrable now
**Non-Goals:** real authentication, password handling, token refresh — all SCRUM-4's scope

## Decisions

- **`RequireAuth` and `RequireRole` as route-wrapping components**, not a single monolithic guard —
  Admin needs both (auth + role), Reports/Absences need only auth. Composable via nesting.
- **`/login` is a fake sign-in**: buttons "Sign in as employee" / "Sign in as admin" call
  `sessionStore.setSession()` with mock data. Clearly marked as a placeholder in-code. Replaced wholesale
  when SCRUM-4 exists — nothing here is meant to survive that.
- **Redirect preserves `from` via router state** (`<Navigate to="/login" state={{ from: location }} />`),
  so `/login` can send the user back to where they started once "signed in."

## Risks / Trade-offs

None material — this is a placeholder by design, replaced when real auth lands.
