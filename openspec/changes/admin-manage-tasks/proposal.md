## Why

SCRUM-70: the admin manages the tasks employees report hours against —
create (assigned to a project), edit, and close, where "delete" specifically
means marking the task closed (not the generic active/inactive soft-delete
used elsewhere in this epic) so reporting history against it is preserved.
A task can also be created directly from the project screen.

Depends on: SCRUM-63 (data model — `Task.status`, added by
`admin-data-model`), `admin-area-shell`, `admin-crud-patterns`,
`admin-api-authz`, `admin-manage-projects` (SCRUM-69, provides the project
records this depends on).

## What Changes

- Backend: `GET /admin/tasks`, `POST /admin/tasks` (name, description,
  projectId, status defaults `OPEN`), `PATCH /admin/tasks/:id` (name,
  description, status)
- Frontend: `/admin/tasks` screen (`AdminEntityTable`: name, project,
  status; `AdminEntityForm`: name, description, project picker, status
  toggle) — the toggle here is wired to open/closed `status`, not
  `isActive` (see design.md)
- "Create task" entry point also added to the `/admin/projects` screen,
  pre-filling that project

### Non-goals

- Task-to-user assignment — that's SCRUM-71, depends on this
- Filtering the project picker to active projects only — not called out in
  SCRUM-70's acceptance criteria the way it is for SCRUM-69's client picker;
  revisit only if asked

## Capabilities

### New Capabilities

- `backend-admin-tasks`: CRUD for tasks, using `status` (open/closed) as
  the "delete" mechanism per SCRUM-70
- `frontend-admin-tasks`: the `/admin/tasks` screen, plus the
  create-from-project entry point

## Impact

- New: `backend/src/routes/adminTask.routes.ts`,
  `controllers/adminTask.controller.ts`, `services/adminTask.service.ts`,
  `types/adminTask.schema.ts`
- New: `frontend/src/pages/admin/AdminTasks.tsx` at `/admin/tasks`
- `frontend/src/pages/admin/AdminProjects.tsx` (from `admin-manage-
  projects`): add a "create task" action per project row
- `backend/src/app.ts`: register the new task router
