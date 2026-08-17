## Why

SCRUM-71: the admin controls which tasks each employee can report against
by assigning users directly to tasks — never to clients or projects. This
is the rule that drives the employee reporting experience: an employee
sees only tasks they're assigned to, and the client/project dropdowns in
their reporting form only show entries reachable through an assigned task.

Depends on: SCRUM-63 (data model — `TaskAssignment`, added by
`admin-data-model`), `admin-area-shell`, `admin-crud-patterns`,
`admin-api-authz`, `admin-manage-users` (SCRUM-67), `admin-manage-tasks`
(SCRUM-70). Consumed by SCRUM-6 (employee reporting) — not modified by this
change (see Non-goals).

## What Changes

- Backend: `GET /admin/assignments` (list, filterable by user or task),
  `POST /admin/assignments` (userId + taskId), `DELETE
  /admin/assignments/:id` (or equivalent user+task pair removal) — removing
  an assignment does not touch any existing time report
- Frontend: `/admin/assignments` screen: pick a user, pick a task, assign;
  view and remove existing assignments

### Non-goals

- Changing the employee reporting form's dropdown filtering itself — that's
  SCRUM-6/SCRUM-114's territory, which will need to read `TaskAssignment`
  once this exists; this change only makes the assignment data available,
  it does not touch the reporting UI
- Assigning users to clients or projects — explicitly out of scope per the
  acceptance criteria ("never to clients or projects")

## Capabilities

### New Capabilities

- `backend-admin-assignments`: create/list/remove user↔task assignments
- `frontend-admin-assignments`: the `/admin/assignments` screen

## Impact

- New: `backend/src/routes/adminAssignment.routes.ts`,
  `controllers/adminAssignment.controller.ts`,
  `services/adminAssignment.service.ts`,
  `types/adminAssignment.schema.ts`
- New: `frontend/src/pages/admin/AdminAssignments.tsx` at
  `/admin/assignments`
- `backend/src/app.ts`: register the new assignment router
- Downstream, not part of this change: SCRUM-6/SCRUM-114 (employee
  reporting) will need to query `TaskAssignment` to filter the
  client/project dropdowns per SCRUM-71's acceptance criteria — flagged
  here so it isn't missed when that work is picked up
