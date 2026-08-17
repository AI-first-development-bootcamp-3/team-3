## 1. Backend

- [ ] 1.1 `adminProject.schema.ts`: zod schemas for create (name, clientId)
      / edit body, id param
- [ ] 1.2 `adminProject.service.ts`: list (include client), create
      (reject if client inactive), update (name, active)
- [ ] 1.3 `adminProject.controller.ts` + `adminProject.routes.ts`:
      `GET/POST /admin/projects`, `PATCH /admin/projects/:id`, guarded
- [ ] 1.4 Register the router in `app.ts`

## 2. Frontend

- [ ] 2.1 `services/adminProjects.ts`: typed API calls, including fetching
      active clients for the picker
- [ ] 2.2 `AdminProjects.tsx` page using `AdminEntityTable` (name, client,
      status) and `AdminEntityForm` (name, client picker, active toggle)
- [ ] 2.3 Wire into the `/admin/projects` route
- [ ] 2.4 Apply Figma-matched styling (blocked until file is shared)

## 3. Verification

- [ ] 3.1 Backend tests: create under active client succeeds, create under
      inactive client rejected, edit, deactivate, deactivating a client
      leaves its projects' active status unchanged, non-admin gets 403
- [ ] 3.2 Frontend tests: list renders with client column, client picker
      excludes inactive clients, deactivate + confirm flow
- [ ] 3.3 Manual: deactivate a client with an active project, verify the
      project stays active and visible
