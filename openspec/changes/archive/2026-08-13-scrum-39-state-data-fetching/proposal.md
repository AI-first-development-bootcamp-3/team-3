## Why

Every Story that reads backend data needs consistent caching (so the same data isn't re-fetched on
every render) and every Story needs to know if the user is logged in and as what role. Both need to be
decided once, not per-Story.

## What Changes

- Install and configure TanStack Query for server-state caching, built on the existing API client
  (SCRUM-20)
- Add a lightweight global store for auth/session state (user, token)
- Wire the API client to attach the session token to requests, now that a session store exists to read
  it from
- One sample query demonstrates caching: two consumers of the same query key trigger only one network
  call

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `frontend-data`: adds server-state caching and session-state requirements alongside the existing
  types, API client and date formatting requirements.

## Impact

New dependency (`@tanstack/react-query`, a state library — see design.md for the choice). New
`src/services/queryClient.ts`, `src/services/sessionStore.ts`. `apiClient.ts` gains a small addition to
attach the session token. `/dev/sample-form` gets a sample query demo.
