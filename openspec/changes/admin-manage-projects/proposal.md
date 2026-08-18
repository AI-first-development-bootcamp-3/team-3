## Why

SCRUM-69: the admin manages projects under clients — create (picking from
active clients only), edit, and soft-delete, with an explicit, documented
answer to what happens to a project when its client is deactivated (it must
not be silently deleted).

Depends on: SCRUM-63 (data model — `Project.isActive`, `Project.clientId`
already exist), `admin-area-shell`, `admin-crud-patterns`, `admin-api-authz`,
`admin-manage-clients` (SCRUM-68, provides the client records this depends
on).

## What Changes

- Backend: `GET /admin/projects`, `POST /admin/projects` (name, clientId —
  validated against active clients only), `PATCH /admin/projects/:id`
  (name, active/inactive)
- Frontend: `/admin/projects` screen (`AdminEntityTable`: name, client,
  status; `AdminEntityForm`: name, client picker restricted to active
  clients, active toggle)
- New projects created active by default
- Documented behavior (see design.md): deactivating a client does **not**
  cascade to its projects — a client's existing projects keep their own
  independent active status

### Non-goals

- Tasks (SCRUM-70) — projects exist independently here
- Any UI change to the clients screen itself

## Capabilities

### New Capabilities

- `backend-admin-projects`: CRUD for projects, including the
  active-clients-only constraint on creation
- `frontend-admin-projects`: the `/admin/projects` screen

## Impact

- New: `backend/src/routes/adminProject.routes.ts`,
  `controllers/adminProject.controller.ts`,
  `services/adminProject.service.ts`, `types/adminProject.schema.ts`
- New: `frontend/src/pages/admin/AdminProjects.tsx` at `/admin/projects`
- `backend/src/app.ts`: register the new project router
