## 1. Backend

- [ ] 1.1 `adminAssignment.schema.ts`: zod schemas for create (userId,
      taskId), list query (filter by userId or taskId), id param
- [ ] 1.2 `adminAssignment.service.ts`: list, create (no-op on duplicate
      per the `admin-data-model` spec), remove
- [ ] 1.3 `adminAssignment.controller.ts` + `adminAssignment.routes.ts`:
      `GET/POST /admin/assignments`, `DELETE /admin/assignments/:id`,
      guarded
- [ ] 1.4 Register the router in `app.ts`

## 2. Frontend

- [ ] 2.1 `services/adminAssignments.ts`: typed API calls
- [ ] 2.2 `AdminAssignments.tsx` page: user picker, task picker, assign
      button, list of current assignments with a remove action
- [ ] 2.3 Wire into the `/admin/assignments` route
- [ ] 2.4 Apply Figma-matched styling (blocked until file is shared)

## 3. Verification

- [ ] 3.1 Backend tests: create, duplicate create is a no-op, remove,
      remove doesn't touch existing time reports, non-admin gets 403
- [ ] 3.2 Frontend tests: assign flow, remove flow
- [ ] 3.3 Manual: assign a user to a task, remove the assignment, confirm
      any prior time report from that user against that task is untouched
