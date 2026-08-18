Covers SCRUM-211 (frontend scope only - backend already covered by `admin-create-user-backend`).

## 1. Frontend tests

- [x] 1.1 `RequireRole.test.tsx` - forbidden message when no user is signed in, forbidden message when the signed-in user has a different role, renders children when the role matches
- [x] 1.2 `CreateUserForm.test.tsx` - add a `400` (malformed input) response case asserting the form-level alert
- [x] 1.3 `adminUsers.test.ts` - `createUser()` posts to `/admin/users` with the given body and returns the parsed response; rejects with `ApiError` on a non-2xx response

## 2. Verify

- [x] 2.1 Frontend suite passing (33/33), lint + typecheck clean
- [x] 2.2 Cross-check against the four SCRUM-211 scenarios: successful creation, duplicate email, non-admin blocked, invalid input - all covered
