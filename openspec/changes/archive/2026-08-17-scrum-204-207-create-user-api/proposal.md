## Why

Self-registration doesn't exist by design (per the PRD: users are created by the admin only). SCRUM-61's core backend piece is the endpoint that does that creation: `POST /admin/users` (SCRUM-204), with input validation (SCRUM-205), password hashing (SCRUM-206), and role assignment (SCRUM-207). `minimal-login` (merged) already provides the `mustChangePassword` field and the login/change-password flow this endpoint's output feeds into.

## What Changes

- `POST /admin/users`, gated by the existing `authenticate` + `requireRole(Role.ADMIN)` middleware (reused as-is)
- `adminUser.schema.ts` — zod validation for `{ email, displayName, role, temporaryPassword? }`
- `adminUser.service.ts` — creates the user with `mustChangePassword: true`; generates a temporary password when the admin doesn't supply one; duplicate email is a `409` (relies on the DB's unique constraint, not a separate check-then-create, to avoid a race)
- Response includes the plaintext temporary password once, at creation time — the only channel to relay it to the new user until `user-credential-email` (next sprint) automates that

### Non-goals

- Emailing the credentials automatically — that's the next sprint (`user-credential-email` / SCRUM-208)
- The create-user form UI — that's `admin-create-user-frontend` (SCRUM-202/210)
- Full user CRUD (edit, list, deactivate) — out of SCRUM-61's scope entirely (see SCRUM-67)

## Capabilities

### New Capabilities

- `backend/admin-user-creation`: Administrator-only user account creation with a generated or admin-chosen temporary password
