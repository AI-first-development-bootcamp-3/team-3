## 1. Backend

- [ ] 1.1 Extend `adminUser.schema.ts`: edit body schema (displayName,
      isActive)
- [ ] 1.2 Extend `adminUser.service.ts`: `listUsers()`, `updateUser(id, body)`
- [ ] 1.3 Extend `adminUser.controller.ts` + `adminUser.routes.ts`:
      `GET /admin/users`, `PATCH /admin/users/:id`, guarded like the
      existing three routes

## 2. Frontend

- [ ] 2.1 Extend `services/adminUsers.ts`: `listUsers()`, `updateUser()`
- [ ] 2.2 `AdminUsers.tsx` page at `/admin/users`: `AdminEntityTable` (full
      name, email, role, status) + existing `CreateUserForm` + new
      `AdminEntityForm`-based edit (name, active toggle) + surfaced
      reset-password / role-change actions per row
- [ ] 2.3 Apply Figma-matched styling (blocked until file is shared)

## 3. Fold in prior work

- [ ] 3.1 Confirm `admin-create-user-backend`, `admin-create-user-frontend`,
      `admin-create-user-frontend-tests` are archived into
      `openspec/changes/archive/` with a note pointing to this change
- [ ] 3.2 No rework of create/reset-password/role-change behavior — verify
      existing tests for them still pass unchanged after the `/admin/users`
      page restructure

## 4. Verification

- [ ] 4.1 Backend tests: list returns expected shape, edit updates fields,
      deactivate soft-deletes, non-admin gets 403
- [ ] 4.2 Frontend tests: list renders, edit flow, deactivate + confirm flow
- [ ] 4.3 Manual: create a user (existing flow), see it in the list, edit
      its name, deactivate it and confirm it's marked inactive without
      losing any historical reports
