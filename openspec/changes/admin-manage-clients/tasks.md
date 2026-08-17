## 1. Backend

- [ ] 1.1 `adminClient.schema.ts`: zod schemas for create/edit body,
      id param
- [ ] 1.2 `adminClient.service.ts`: list, create, update (name, contact,
      active)
- [ ] 1.3 `adminClient.controller.ts` + `adminClient.routes.ts`:
      `GET/POST /admin/clients`, `PATCH /admin/clients/:id`, each with
      `authenticate` + `requireRole(Role.ADMIN)`
- [ ] 1.4 Register the router in `app.ts`

## 2. Frontend

- [ ] 2.1 `services/adminClients.ts`: typed API calls
- [ ] 2.2 `AdminClients.tsx` page using `AdminEntityTable` (name, status)
      and `AdminEntityForm` (name, contact details, active toggle)
- [ ] 2.3 Wire into the `/admin/clients` route from `admin-area-shell`
- [ ] 2.4 Apply Figma-matched styling (blocked until file is shared, see
      `admin-area-shell/design.md`)

## 3. Verification

- [ ] 3.1 Backend tests: create, edit, deactivate, non-admin gets 403
- [ ] 3.2 Frontend tests: list renders, create flow, deactivate + confirm
      flow
- [ ] 3.3 Manual: create a client, verify it appears active in the list;
      deactivate it, verify status updates and no data is deleted
