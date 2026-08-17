> **Groups 1 and 2 touch disjoint files** — `middleware/` versus `services/`, `controllers/`, `routes/` —
> and can be implemented concurrently against the contract in design.md (D2–D5). Group 3 needs both.
> Backend-only change: nothing under `frontend/` is edited.

## 1. Middleware — re-check the account on every authenticated request

- [x] 1.1 Add an `AuthenticatedUser` interface (`{ sub: string; role: Role }`) to `backend/src/types/auth.ts` alongside the existing `JwtPayload`, and repoint `Express.Request['user']` in `backend/src/types/express.d.ts` at it, so the token's payload type and the request's caller type stop being interchangeable (design.md D4)
- [x] 1.2 Make `authenticate` in `backend/src/middleware/auth.middleware.ts` `async`. Express 5 forwards rejected promises to the error handler, so no `asyncHandler` wrapper or extra `try/catch` around the lookup is needed (design.md — Context)
- [x] 1.3 After the existing `jwt.verify` succeeds, load the caller with `prisma.user.findUnique({ where: { id: payload.sub, isActive: undefined } })` — the explicit `isActive: undefined` opts out of the soft-delete extension's implicit filter so a deactivated row is still returned and the two failure cases stay distinguishable (design.md D2)
- [x] 1.4 Reject a `null` result with `AppError.unauthorized('Invalid authentication token')`, matching how an unverifiable caller is already treated
- [x] 1.5 Reject a row with `isActive === false` with `new AppError(401, 'ACCOUNT_DEACTIVATED', 'Account is no longer active')`, constructed inline in the same style as the existing `TOKEN_EXPIRED` (design.md D3)
- [x] 1.6 Set `req.user = { sub: payload.sub, role: user.role }` — `sub` from the verified token, `role` from the stored row, so a role change lands on the next request (design.md D4). Leave `requireRole` untouched
- [x] 1.7 Update the JSDoc above `authenticate` to state the second gate (account must still exist and be active) and that `role` is read from storage rather than the token, replacing the current "verifies the bearer token's signature and expiry" description which is no longer the whole story
- [x] 1.8 Rework `backend/src/middleware/test/auth.middleware.test.ts` so every case that expects success creates a real user with the `createUser` factory and signs `user.id` into `sub` — the existing fabricated `'user-1'` / `'admin-1'` subjects now produce `401` (design.md D7). Keep the no-token, malformed-token, wrong-key, and expired-token cases as they are
- [x] 1.9 Add middleware tests: a valid token for a deactivated user returns `401` with code `ACCOUNT_DEACTIVATED`; a valid token whose `sub` matches no row returns `401` with code `UNAUTHORIZED`; a token for an active user still returns `200` and exposes the identity
- [x] 1.10 Add a middleware test that a user whose stored role was changed to `EMPLOYEE` after their token was minted with `ADMIN` is refused `403` on the admin-only route, and the reverse case (`EMPLOYEE` token, stored role now `ADMIN`) is permitted
- [x] 1.11 Add a middleware test that an unauthenticated request to a public route still succeeds and performs no user lookup

## 2. Admin endpoint — deactivate and reactivate

- [x] 2.1 Add a body schema for `{ isActive: boolean }` (required, strictly boolean) to `backend/src/types/adminUser.schema.ts`, following the shape of the existing `changeRoleBodySchema`
- [x] 2.2 Add `setUserActive(id: string, isActive: boolean)` to `backend/src/services/adminUser.service.ts`, delegating to the existing `updateUserOrNotFound` — `update` is not intercepted by the soft-delete extension, so it reaches a deactivated row without an opt-out, and its `P2025 → 404` mapping already covers the unknown-user case (design.md D5)
- [x] 2.3 Add the controller handler to `backend/src/controllers/adminUser.controller.ts`, responding `200` with the updated user, following `patchAdminUserRole`
- [x] 2.4 Register `PATCH /admin/users/:id/status` in `backend/src/routes/adminUser.routes.ts` behind `authenticate`, `requireRole(Role.ADMIN)`, and `validate({ params: userIdParamSchema, body: <new schema> })`
- [x] 2.5 Write the OpenAPI block for the new route in the same style as its siblings, documenting the `isActive` body property and the `200` / `400` / `401` / `403` / `404` responses
- [x] 2.6 Extend `backend/src/routes/test/adminUser.routes.test.ts`: an admin deactivating an active user gets `200` with `isActive: false` and no password hash in the response; an admin reactivating a deactivated user gets `200` with `isActive: true`; setting the state the account already holds returns `200` rather than an error
- [x] 2.7 Add authorization and validation tests for the new route: an authenticated employee gets `403` and the target's state is unchanged; a request with no token gets `401`; a missing or non-boolean `isActive` gets `400`; a malformed id gets `400`; a well-formed but unknown id gets `404`

## 3. Integration and closeout

- [x] 3.1 Add an integration test covering the whole point of the change: an employee logs in and uses their token successfully, an admin deactivates them via `PATCH /admin/users/:id/status`, and the *same* token is then refused `401 ACCOUNT_DEACTIVATED` on a protected route
- [x] 3.2 Add the administrator variant, which is the scenario that motivated the ticket: an admin's token works against `POST /admin/users`, a second admin deactivates them, and the same token can no longer create an account
- [x] 3.3 Add a test that reactivating restores access to a token issued before the deactivation, provided it has not expired, and that a deactivated user is refused at the login endpoint with the same generic response as wrong credentials
- [x] 3.4 Run `npm run lint` and `npm test` in `backend/` and confirm green — pay attention to route test files beyond the ones edited here, since every authenticated test now depends on its token's subject existing in the database
- [x] 3.5 Verify the Swagger UI renders the new endpoint and that no existing endpoint's documentation regressed
- [x] 3.6 Confirm no frontend change was needed by exercising a deactivation against the running app: the existing global `401` handler should clear the session and redirect to `/login`, showing the current generic "Session Expired" toast. If it does not, that is a finding for the follow-up frontend ticket, not a fix in this change
