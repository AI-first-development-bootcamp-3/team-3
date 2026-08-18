## 1. Backend

- [x] 1.1 `adminClient.schema.ts`: zod schemas for create/edit body,
      id param
- [x] 1.2 `adminClient.service.ts`: list, create, update (name, contact,
      active)
- [x] 1.3 `adminClient.controller.ts` + `adminClient.routes.ts`:
      `GET/POST /admin/clients`, `PATCH /admin/clients/:id`, each with
      `authenticate` + `requireRole(Role.ADMIN)`
- [x] 1.4 Register the router in `app.ts`

## 2. Frontend

- [x] 2.1 `services/adminClients.ts`: typed API calls
- [x] 2.2 `AdminClients.tsx` page using `AdminEntityTable` (name, status)
      and `AdminEntityForm` (name, contact details, active toggle)
- [x] 2.3 Wire into the `/admin/clients` route from `admin-area-shell`
- [x] 2.4 Apply Figma-matched styling

## 3. Verification

- [x] 3.1 Backend tests: create, edit, deactivate, non-admin gets 403
- [x] 3.2 Frontend tests: list renders, create flow, deactivate + confirm
      flow
- [x] 3.3 Manual: create a client, verify it appears active in the list;
      deactivate it, verify status updates and no data is deleted
