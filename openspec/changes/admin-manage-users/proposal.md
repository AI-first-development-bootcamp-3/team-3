## Why

SCRUM-67: the admin manages the people in the system — add, edit, change
role, and deactivate without losing history. A meaningful slice of this is
already shipped from an earlier sprint under three separate OpenSpec
changes: `admin-create-user-backend` (`POST /admin/users`),
`admin-create-user-frontend` (the create form UI), and
`admin-create-user-frontend-tests` (coverage for both, plus `RequireRole`).
Password reset (`PATCH /admin/users/:id/reset-password`) and role change
(`PATCH /admin/users/:id/role`) also already exist in
`adminUser.routes.ts`. What's still missing against SCRUM-67's full
acceptance criteria: a way to **list** users, and a way to **edit**
details/toggle active-inactive (soft-delete) — there is no `GET
/admin/users` and no general edit/deactivate endpoint yet.

This change absorbs the three `admin-create-user-*` changes as already-done
prerequisites (they get archived once this change exists — see Impact) and
scopes its own work to the remaining gap: list + edit + deactivate.

Depends on: SCRUM-63 (data model), `admin-area-shell` (SCRUM-64),
`admin-crud-patterns` (SCRUM-65), `admin-api-authz` (SCRUM-66), SCRUM-4
(external, out of this epic).

## What Changes

- Backend: `GET /admin/users` (list: full name, email, role, status),
  `PATCH /admin/users/:id` (displayName, active/inactive) — new
- Frontend: `/admin/users` screen combining the existing `CreateUserForm`
  (relocated here by `admin-area-shell`) with a new list view
  (`AdminEntityTable`) and an edit form (`AdminEntityForm`) for the fields
  above, plus surfacing the existing reset-password and role-change actions
  from the list
- **Already done, absorbed as-is, no rework**: create user
  (`POST /admin/users`), reset password, change role, and their test
  coverage — from the three archived changes

### Non-goals

- Automated credential emailing — that's `user-credential-email`
  (SCRUM-208), a separate active change, untouched by this one
- Changing how `mustChangePassword` / first-login flows work — already
  shipped, out of scope here

## Capabilities

### New Capabilities

- `backend-admin-users-list-edit`: list and edit/deactivate for users
  (create, reset-password, role-change already shipped, unmodified by this
  change)
- `frontend-admin-users`: the `/admin/users` screen — list, create (existing
  form relocated here), edit, deactivate

## Impact

- `backend/src/routes/adminUser.routes.ts`: add `GET /` and `PATCH /:id`
- `backend/src/controllers/adminUser.controller.ts`,
  `services/adminUser.service.ts`, `types/adminUser.schema.ts`: extend with
  list/edit
- `frontend/src/pages/admin/AdminUsers.tsx` (new, at `/admin/users`):
  composes existing `CreateUserForm` with new list/edit UI
- `frontend/src/services/adminUsers.ts`: add `listUsers()`, `updateUser()`
- **Archive** `openspec/changes/admin-create-user-backend`,
  `admin-create-user-frontend`, `admin-create-user-frontend-tests` into
  `openspec/changes/archive/` once this change is proposed — their scope is
  now represented here as already-done prerequisites
