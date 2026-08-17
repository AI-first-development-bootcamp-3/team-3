## Why

SCRUM-211 asks for tests covering successful creation, duplicate email, non-admin access blocked, and invalid input for the admin create-user feature. The backend already covers all four in `adminUser.routes.test.ts` (`admin-create-user-backend`). The frontend (`admin-create-user-frontend`) covers successful creation, duplicate email, and client-side invalid input, but has two real gaps:

- `RequireRole.tsx` - the component gating `/admin` from non-admins - has no automated test; it was only checked manually.
- `CreateUserForm.tsx`'s handling of the backend's `400` (malformed input) response is untested - only the empty-submit (client-side) and `500` (generic failure) paths are covered.

## What Changes

- `RequireRole.test.tsx` (new) - forbidden message for no user / wrong role, renders children for the matching role
- `CreateUserForm.test.tsx` (extend) - add a `400` response case asserting the form-level alert
- `adminUsers.test.ts` (new) - unit coverage for the `createUser()` service call (request shape, success, and error propagation)

### Non-goals

- No new application code or behavior change - this change only adds test coverage for existing, already-shipped code.

## Capabilities

### Modified Capabilities

- `frontend-forms`: no behavior change; adds missing test coverage for the admin create-user form and its route guard.
