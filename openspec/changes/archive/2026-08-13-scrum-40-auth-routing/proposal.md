## Why

Reports and Absences need a logged-in user; Admin needs an admin. Without route guards now, every Story
built into those pages would have to remember to check auth itself, and likely wouldn't consistently.

## What Changes

- A route guard redirecting unauthenticated users to `/login`, preserving where they were headed
- A role guard restricting the Admin route to the `admin` user type
- A minimal placeholder `/login` page — no real backend auth exists yet (that's the separate Auth epic,
  SCRUM-4, untouched so far); this page exists so the guards can be demonstrated and tested, not as real
  authentication
- Placeholder admin and regular-user routes demonstrate both guards working

## Capabilities

### New Capabilities
- `frontend-auth-routing`: which routes require a session, which require a specific role, and what
  happens when a guard fails.

### Modified Capabilities
_None._

## Impact

New `src/components/RequireAuth.tsx`, `src/components/RequireRole.tsx`, `src/pages/Login.tsx`.
`routes.tsx` wraps Reports/Absences in `RequireAuth` and Admin in `RequireAuth` + `RequireRole`.
