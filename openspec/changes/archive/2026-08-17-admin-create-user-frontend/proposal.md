## Why

`admin-create-user-backend` (merged) provides `POST /admin/users`, but nothing in the UI calls it — `Admin.tsx` is still the original `<h1>Admin</h1>` stub. This change is the form itself (SCRUM-202), the success/error feedback around it (SCRUM-210), and confirms the admin-only route guard already covers it (SCRUM-203).

## What Changes

- `CreateUserForm.tsx` + `.schema.ts` — react-hook-form + zod + antd `Form`/`Controller`, the same pattern as `SampleForm`/`Login`/`ChangePassword`
- `services/adminUsers.ts` — typed `createUser()` calling `POST /admin/users`
- Wired into `Admin.tsx`, replacing the stub; already covered by the existing `RequireAuth` + `RequireRole role="admin"` on `/admin` — no new guard code needed (confirms SCRUM-203 rather than building it)
- Feedback (SCRUM-210): `notification.success` showing the created email + temporary password (also emailed per SCRUM-208) on success; inline `Form.Item` errors for field-level failures (duplicate email → 409 on the email field specifically; malformed input caught client-side by the zod schema before it ever reaches the server)

### Non-goals

- A users list/edit screen — that's SCRUM-67's scope, not this story
- Any change to the guard mechanism itself — `RequireAuth`/`RequireRole` are reused exactly as they are

## Capabilities

### Modified Capabilities

- `frontend-forms`: adds the admin create-user form as a concrete instance of the schema-driven form pattern (the capability's own purpose statement already calls out "admin CRUD" as a category it must serve)
