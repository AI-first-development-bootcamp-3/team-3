All on `feat/SCRUM-204-create-user-api`, cut from `story-scrum61`. Covers SCRUM-204, 205, 206, 207.

## 1. Backend

- [x] 1.1 `adminUser.schema.ts` — zod schema for `{ email, displayName, role, temporaryPassword? }`
- [x] 1.2 `adminUser.service.ts` — `createUser()`: generates a temp password when none supplied, hashes it, sets `mustChangePassword: true`, maps `P2002` to `409`
- [x] 1.3 `adminUser.controller.ts` + `adminUser.routes.ts` — `POST /admin/users`, `authenticate` + `requireRole(Role.ADMIN)` + `validate`; mounted in `app.ts`
- [x] 1.4 Tests: generated-password creation, admin-supplied-password creation, duplicate email (409), non-admin caller (403), unauthenticated (401), malformed body (400, all three invalid fields reported), short admin-supplied password (400), invalid request does not persist a row

## 2. Verify

- [x] 2.1 Backend suite: 95/95 passing, lint + typecheck clean
- [x] 2.2 Manual check: created a user via curl as the seeded admin, confirmed 201 with `mustChangePassword: true` and no password hash leaked; duplicate email → 409; non-admin caller → 403; the new user's temporary password logs them in successfully with `mustChangePassword: true` surfaced
- [ ] 2.3 Open PR `feat/SCRUM-204-create-user-api` → `story-scrum61`
