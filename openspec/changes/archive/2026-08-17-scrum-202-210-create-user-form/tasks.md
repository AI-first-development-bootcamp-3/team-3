All on `feat/SCRUM-202-create-user-form`, cut from `story-scrum61`. Covers SCRUM-202, 210; confirms SCRUM-203.

## 1. Frontend

- [x] 1.1 `services/adminUsers.ts` — typed `createUser()` calling `POST /admin/users`
- [x] 1.2 `CreateUserForm.schema.ts` — zod schema (`displayName`, `email`, `role` enum, optional `temporaryPassword` with an 8-char minimum only when non-empty)
- [x] 1.3 `CreateUserForm.tsx` — react-hook-form + zod + antd `Form`/`Controller`/`Select`; direct `request()` call in the submit handler (not `useMutation` — see design.md); 409 → inline email field error, other failures → form-level alert; success → `notification.success` with the created email + temporary password, form reset
- [x] 1.4 Wired into `Admin.tsx`, replacing the `<h1>Admin</h1>` stub
- [x] 1.5 Tests: schema (valid/invalid combinations), component (renders all fields, empty-submit validation, successful creation shows notification + resets form, 409 shows inline email error, other failure shows form-level error without a competing global toast)

## 2. Verify

- [x] 2.1 Frontend suite: 27/27 passing, lint + typecheck clean
- [x] 2.2 Manual check (with Dan, via the running dev stack): logged in as admin, created a user through the real form, confirmed the success notification (with temp password) and form reset, confirmed a duplicate-email resubmit shows the inline "already exists" error under Email, confirmed the created employee account logs in with `mustChangePassword: true` and is correctly refused `/admin` by the existing role guard
- [ ] 2.3 Open PR `feat/SCRUM-202-create-user-form` → `story-scrum61`
