> **Groups 1 and 2 are independent and share no files** — see design.md → "Work split for parallel
> implementation". They can be implemented concurrently by separate agents against the contract frozen in
> design.md (D3–D5). Group 3 requires both.

## 1. Backend — configurable lifetimes and `rememberMe`

- [ ] 1.1 Add `JWT_EXPIRES_IN_SECONDS` (default `28800`) and `JWT_REMEMBER_ME_EXPIRES_IN_SECONDS` (default `2592000`) to `envSchema` in `backend/src/config/env.ts` as `z.coerce.number().int().positive()` with defaults, following the commenting style of the existing entries
- [ ] 1.2 Add a `.refine()` to `envSchema` asserting `JWT_REMEMBER_ME_EXPIRES_IN_SECONDS >= JWT_EXPIRES_IN_SECONDS`, with a message naming both variables
- [ ] 1.3 Add a unit test for `parseEnv` covering: both defaults applied when unset, explicit values accepted, and the refine rejecting a remember-me duration shorter than the default
- [ ] 1.4 Document both variables in `backend/.env.example` with human-readable equivalents in the comment (8 hours / 30 days)
- [ ] 1.5 Add `rememberMe: z.boolean().optional().default(false)` to `loginBodySchema` in `backend/src/types/auth.schema.ts`
- [ ] 1.6 Extend `LoginResult` in `backend/src/services/auth.service.ts` with `expiresAt: string` (ISO 8601), and change `login()` to accept the `rememberMe` flag, select the configured lifetime, sign with it, and derive `expiresAt` from that same value — the JWT payload stays `{ sub, role }` (design.md D4)
- [ ] 1.7 Forward `rememberMe` from the request body through `postLogin` in `backend/src/controllers/auth.controller.ts`
- [ ] 1.8 Update the `POST /login` OpenAPI block in `backend/src/routes/auth.routes.ts` to document the optional `rememberMe` property and the `expiresAt` field in the 200 response
- [ ] 1.9 Extend `backend/src/routes/test/auth.routes.test.ts`: token `exp` reflects the default lifetime when `rememberMe` is omitted and when it is `false`, reflects the extended lifetime when `true`, the extended `exp` is strictly greater than the default, a non-boolean `rememberMe` returns `400`, and the returned `expiresAt` matches the decoded token's `exp`
- [ ] 1.10 Add a test asserting the JWT payload contains no `rememberMe` claim, so a remembered token is indistinguishable from a normal one apart from expiry
- [ ] 1.11 Run `npm run lint` and `npm test` in `backend/` and confirm green

## 2. Frontend — session persistence and remember-me UI

- [x] 2.1 Create a storage adapter module under `frontend/src/services/` that reads, writes, and removes the `abra.session` key, takes the target storage (`sessionStorage` or `localStorage`) as a parameter, and wraps every access in `try/catch` so a throwing or unavailable `Storage` degrades to a no-op (design.md D7)
- [x] 2.2 Add unit tests for the adapter: round-trip write/read, removal, malformed JSON returns nothing rather than throwing, and a storage that throws on access is handled silently
- [x] 2.3 Extend `frontend/src/services/sessionStore.ts` so `setSession(user, token, expiresAt, rememberMe)` persists to `localStorage` when remembered and `sessionStorage` otherwise, and `clearSession()` removes the key from **both** storages (design.md D6)
- [ ] 2.4 Add a synchronous `rehydrateSession()` to the session store that reads `sessionStorage` first then `localStorage`, discards an entry whose `expiresAt` has passed or whose shape is unexpected, and otherwise populates `user` and `token`
- [ ] 2.5 Add unit tests for the store: persists to the correct storage per flag, `clearSession` clears both, rehydrate restores a valid session, rehydrate discards an expired one, rehydrate discards a malformed one, and `sessionStorage` takes precedence when both hold an entry
- [ ] 2.6 Call `rehydrateSession()` in `frontend/src/main.tsx` before the router is created, so the store is correct on `RequireAuth`'s first evaluation and no loading state is needed (design.md D7)
- [ ] 2.7 Add `rememberMe: z.boolean()` to `loginFormSchema` in `frontend/src/pages/Login.schema.ts` and default it to `false` in the form's `defaultValues`
- [ ] 2.8 Add an Ant Design `Checkbox` labelled "Remember me" to `frontend/src/pages/Login.tsx`, wired through `Controller` like the existing fields, and pass the value into `login()` and on to `setSession`
- [ ] 2.9 Update `login()` in `frontend/src/services/auth.ts` to send `rememberMe` in the `POST /login` body and to return `expiresAt` from the response alongside `user` and `token`
- [ ] 2.10 Extend `frontend/src/pages/Login.test.tsx`: the checkbox renders unchecked by default, submitting unchecked sends `rememberMe: false`, submitting checked sends `true`, and the resulting session lands in the expected storage in each case
- [ ] 2.11 Run `npm run lint` and `npm test` in `frontend/` and confirm green

## 3. Integration and closeout

- [ ] 3.1 Verify end to end against a running stack: log in unchecked → reload the page → still signed in; close the tab and reopen → back at `/login`
- [ ] 3.2 Verify end to end: log in with "Remember me" → quit and reopen the browser → still signed in
- [ ] 3.3 Verify an expired session behaves correctly: with a stored session whose `expiresAt` has passed, booting the app lands on `/login` with no flash of authenticated content
- [ ] 3.4 Confirm the 401 path still works: a request with an expired token clears the persisted session, shows the "Session Expired" toast, and redirects to `/login`
- [ ] 3.5 File the follow-up Jira subtask under SCRUM-58 for the deactivated-user revocation gap documented in design.md → Risks, and cross-reference it from that section
- [ ] 3.6 Move SCRUM-181 to Done and open the PR from `feat/remember-me-token-expiry` into `development`
