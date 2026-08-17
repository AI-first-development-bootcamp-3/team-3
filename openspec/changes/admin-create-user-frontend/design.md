## Context

- `feat/SCRUM-202-create-user-form`, cut directly from `story-scrum61` (not stacked on `feat/SCRUM-208-credential-email`, which wasn't merged yet at the time — this branch has no dependency on SCRUM-208's code, only on the `POST /admin/users` endpoint from `admin-create-user-backend`, already merged).
- `/admin` route already wrapped in `RequireAuth` + `RequireRole role="admin"` (from `frontend-auth-routing`, merged in the Setup epic) — role-gating was already solved before this change started.

## Decisions

### Direct `request()` call in the submit handler, not `useMutation`
`queryClient.ts`'s global `MutationCache.onError` shows a generic "An unexpected error occurred" toast for any mutation error that isn't 401 or 500+ — which would double up with this form's own inline 409 handling (both a generic toast *and* a specific "email already exists" field error for the same event). `Login.tsx` and `ChangePassword.tsx` already established the direct-call pattern for exactly this reason; this form follows it for consistency rather than introducing `useMutation` as the first precedent in the codebase and then immediately needing to work around its global error handler.

### Duplicate email surfaces as a `Form.Item` error, not a toast
A 409 on `email` is set via react-hook-form's `setError('email', ...)`, landing directly under the field the problem is about — more actionable than a generic toast the user has to correlate back to a field themselves.

### Success feedback includes the temporary password
Consistent with `admin-create-user-backend`'s API response shape (which already returns it) and `user-credential-email`'s "email is the primary channel, response is the fallback" design — showing it in the UI too means the admin isn't blocked if the email doesn't arrive.

## Risks / Trade-offs

**Temporary password appears in a UI notification, not just server-side.** Same trade-off already accepted in `admin-create-user-backend`'s design.md for the API response — the UI simply surfaces what the API already returns.

## Migration Plan

Purely additive - `Admin.tsx`'s stub is replaced, no existing route or guard logic changes.

## Open Questions

None blocking.
