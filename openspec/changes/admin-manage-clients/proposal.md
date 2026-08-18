## Why

SCRUM-68: the admin needs to maintain the client list that projects hang
off — add, edit, and soft-delete (deactivate) clients, with active/inactive
status preserved for history.

Depends on: SCRUM-63 (data model — `Client.isActive` already exists),
`admin-area-shell` (SCRUM-64, provides the `/admin/clients` route slot),
`admin-crud-patterns` (SCRUM-65, provides `AdminEntityTable`/
`AdminEntityForm`), `admin-api-authz` (SCRUM-66, guard coverage).

## What Changes

- Backend: `GET /admin/clients`, `POST /admin/clients`,
  `PATCH /admin/clients/:id` (name, active/inactive) — soft-delete only, no
  `DELETE` endpoint, mirroring the `adminUser.*` pattern (controller →
  service → zod-validated route, `requireRole(Role.ADMIN)` on every route)
- Frontend: `/admin/clients` screen using `AdminEntityTable` (list: name,
  status) + `AdminEntityForm` (name, optional contact details field, active
  toggle) — the first real consumer proving out the SCRUM-65 patterns
- New clients created active by default

### Non-goals

- Projects (SCRUM-69) — clients exist independently here; the client→project
  relationship is exercised from the project side
- Contact-detail structure beyond a single optional free-text field — no
  acceptance criterion asks for more

## Capabilities

### New Capabilities

- `backend-admin-clients`: CRUD (create/list/edit/soft-delete) for clients
- `frontend-admin-clients`: the `/admin/clients` screen

## Impact

- New: `backend/src/routes/adminClient.routes.ts`,
  `controllers/adminClient.controller.ts`, `services/adminClient.service.ts`,
  `types/adminClient.schema.ts` (mirrors `adminUser.*` file layout)
- New: `frontend/src/pages/admin/AdminClients.tsx` wired into
  `/admin/clients` (replacing the placeholder route from `admin-area-shell`)
- `backend/src/app.ts`: register the new client router
