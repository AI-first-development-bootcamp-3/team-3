All on `feat/SCRUM-58-minimal-login`, cut from `story-scrum61`. Supports SCRUM-209 within SCRUM-61 — not itself a numbered Jira subtask.

## 1. Backend

- [x] 1.1 Add `mustChangePassword` to `User` (Prisma migration), default `true`; set `false` explicitly for seeded dev users
- [x] 1.2 `auth.schema.ts` — zod schemas for login body and change-password body
- [x] 1.3 `auth.service.ts` — `login()` (bcrypt.compare, rejects wrong password/unknown email/inactive account identically, signs JWT) and `changeOwnPassword()` (hashes new password, clears the flag)
- [x] 1.4 `auth.controller.ts` + `auth.routes.ts` — `POST /login` (public), `PATCH /me/password` (authenticated); mounted in `app.ts`
- [x] 1.5 Test factory: `createUser` accepts `mustChangePassword` override, defaults to `false`
- [x] 1.6 Tests: correct login, wrong password, unknown email, inactive account, malformed body, `mustChangePassword: true` surfaced correctly; password change clears the flag (verified via a follow-up login), unauthenticated rejected, short password rejected

## 2. Frontend

- [x] 2.1 `apiClient.ts` — `handleUnauthorizedGlobally` opt-out on `RequestOptions`
- [x] 2.2 `services/auth.ts` — `login()`/`changeOwnPassword()`, `Role → UserType` mapping
- [x] 2.3 `types/user.ts` — optional `mustChangePassword` on `User`
- [x] 2.4 Real `Login.tsx` (react-hook-form + zod + antd `Form`/`Controller`, matching `SampleForm`'s pattern) replacing the two-button placeholder; inline error on 401
- [x] 2.5 `ChangePassword.tsx` + route at `/change-password`
- [x] 2.6 `RequireAuth.tsx` — redirect to `/change-password` when the session's `mustChangePassword` is true and the caller isn't already there
- [x] 2.7 Tests: Login (renders, inline validation, successful login sets session, 401 shows inline error without global redirect), ChangePassword (mismatched-passwords caught client-side, success clears the flag in the store)
- [x] 2.8 `test-setup.ts` — `window.matchMedia` polyfill (jsdom gap; antd's Form/Grid hooks need it, first tests in this repo to render a full antd Form)

## 3. Verify

- [x] 3.1 Backend suite: 87/87 passing, lint + typecheck clean
- [x] 3.2 Frontend suite: 16/16 passing, lint + typecheck clean
- [x] 3.3 Manual check (with Dan): seeded admin login goes straight to Reports; a `mustChangePassword: true` user is forced to `/change-password`, clicking "Admin" from there redirects right back (gate can't be dodged), setting a new password lands on Reports, and the employee role correctly gets "Forbidden" on `/admin` afterward (role mapping confirmed end-to-end)
- [ ] 3.4 Open PR `feat/SCRUM-58-minimal-login` → `story-scrum61`
