## 1. Backend

- [ ] 1.1 `adminTask.schema.ts`: zod schemas for create (name, description,
      projectId) / edit body (name, description, status), id param
- [ ] 1.2 `adminTask.service.ts`: list (include project), create, update
- [ ] 1.3 `adminTask.controller.ts` + `adminTask.routes.ts`:
      `GET/POST /admin/tasks`, `PATCH /admin/tasks/:id`, guarded
- [ ] 1.4 Register the router in `app.ts`

## 2. Frontend

- [ ] 2.1 `services/adminTasks.ts`: typed API calls
- [ ] 2.2 `AdminTasks.tsx` page using `AdminEntityTable` (name, project,
      status) and `AdminEntityForm` with its toggle bound to `status`
      (open/closed) rather than `isActive`
- [ ] 2.3 Wire into the `/admin/tasks` route
- [ ] 2.4 Add "create task" action to `AdminProjects.tsx` rows, pre-filling
      the project
- [ ] 2.5 Apply Figma-matched styling (blocked until file is shared)

## 3. Verification

- [ ] 3.1 Backend tests: create, edit, close (status transitions to
      CLOSED), non-admin gets 403
- [ ] 3.2 Frontend tests: list renders, close + confirm flow, create-from-
      project pre-fills the project
- [ ] 3.3 Manual: close a task, verify existing time reports referencing it
      are still visible/intact
