## 1. Schema and configuration

- [x] 1.1 Add a `LoginAttempt` model to `prisma/schema.prisma`: id, `emailNormalised`, nullable `userId` relation to `User`, `ipAddress`, `outcome` enum (`CREDENTIAL_REJECTED`, `THROTTLED`, `LOCKED`, `SUCCESS`), database-generated `createdAt`; mapped to `login_attempts` with an index on `(emailNormalised, createdAt)`
- [x] 1.2 Generate the migration and confirm it is purely additive — no existing table altered, no backfill
- [x] 1.3 Add `LOCKOUT_MAX_ATTEMPTS` (10), `LOCKOUT_WINDOW_HOURS` (24), `LOCKOUT_DURATION_MINUTES` (30) to `src/config/env.ts` with validation, and mirror them in `.env.example` and `docker-compose.yml`
- [x] 1.4 Assert in config validation that `LOCKOUT_MAX_ATTEMPTS` exceeds `RATE_LIMIT_EMAIL_MAX_ATTEMPTS` and the lockout window exceeds the rate-limit window, so the two tiers cannot be misconfigured into the wrong order

## 2. Error contract

- [x] 2.1 Add `AppError.locked(retryAfterSeconds)` to `src/types/errors.ts` with status `423` and a distinct error code
- [x] 2.2 Ensure the error middleware emits `Retry-After` for `423` the same way it already does for `429` (already generic on any `AppError.retryAfterSeconds`; verified with a dedicated test)

## 3. Attempt recording and lock evaluation

- [x] 3.1 Add `src/services/loginAttempt.service.ts` with a record function (normalises the email with the same trim+lowercase rule as `normaliseAccountKey`, resolves `userId` when the email matches an account, never touches the password)
- [x] 3.2 Add a lock-evaluation function: count `CREDENTIAL_REJECTED` rows for the email with `createdAt` after the most recent `SUCCESS` for that email and within the window; return locked plus remaining seconds once the count reaches the threshold, measured from the attempt that crossed it
- [x] 3.3 Verify the evaluation never deletes or mutates rows — clearing on success is a query bound only (no delete/update call exists in the service; success-clearing is the `cutoff` computation in `evaluateLock`)

## 4. Wiring

- [x] 4.1 Check the lock ahead of the handler in `src/routes/auth.routes.ts`, beside the existing rate-limit check, so a locked request is refused before `bcrypt.compare` runs (implemented inside `rateLimit()` itself, right after the throttle check, since the lock is only meaningful where an account key/email exists — currently just `/login`)
- [x] 4.2 Record the attempt from the existing `res.on('finish')` hook in `src/middleware/rateLimit.middleware.ts`, mapping `401`→`CREDENTIAL_REJECTED`, `429`→`THROTTLED`, `423`→`LOCKED`, `200`→`SUCCESS`
- [x] 4.3 Error-handle the record write locally and log failures — it runs after the response is sent and must never reject unhandled or turn a `401` into a `500` (also applied the same fail-open handling to the lock *read*: a DB error there logs and treats the request as unlocked rather than blocking login)
- [x] 4.4 Document the `423` response for `POST /login` in the OpenAPI/Swagger definitions

## 5. Backend tests

- [x] 5.1 Lock trips at the configured threshold and not one attempt below it
- [x] 5.2 Correct credentials are still refused with `423` while locked
- [x] 5.3 A registered and an unregistered email lock identically, with indistinguishable responses at every step
- [x] 5.4 `Retry-After` decreases across repeated attempts while locked and the lock does not extend
- [x] 5.5 The lock expires on its own once the duration elapses, with no intervention
- [x] 5.6 A success clears accumulated failures, and the failure rows survive that clearing unaltered
- [x] 5.7 Lock state survives a rebuilt in-memory rate-limit store — proves the lock is not process-local
- [x] 5.8 Attempt rows carry the expected fields, and no row contains the submitted password in any column
- [x] 5.9 A `400` (malformed body) still records nothing, matching the existing throttle behaviour

## 6. Frontend

- [x] 6.1 Surface `Retry-After` on `ApiError` if the API client does not already expose it (it did not; added `retryAfterSeconds`)
- [x] 6.2 Add a `423` branch to `Login.tsx` beside the existing 401 and 429 cases, with Hebrew copy stating the remaining wait
- [x] 6.3 Count the remaining time down live and re-enable submission when it reaches zero, clearing the timer on unmount (`useEffect`'s cleanup clears the `setTimeout`)
- [x] 6.4 Confirm the message wording reveals nothing about whether the email is registered — same fixed copy for every locked response, matching the backend's 423 body

## 7. Frontend tests

- [x] 7.1 A `423` response renders the locked message with the remaining time, distinct from the 401, 429, and generic messages
- [x] 7.2 The countdown decrements over time and the form becomes submittable again at zero
- [x] 7.3 Typed email and password survive a `423`, matching the existing 429 behaviour

## 8. Close out

- [x] 8.1 Run the full backend and frontend suites and confirm coverage stays above the 60% project minimum — backend: 200/201 passing (the one failure, a Hebrew/Latin collation sort order flake in `timeReport.routes.test.ts`, is pre-existing and untouched by this change - reproduces on its own in isolation), line coverage 88.4%. Frontend: 67/67 passing. Frontend has no coverage tool installed (`@vitest/coverage-v8` missing) - a pre-existing gap, not introduced here and out of this change's scope to fix.
- [ ] 8.2 Close SCRUM-188, 189, 190 and mark SCRUM-193 done — task 5 and task 7 complete its locked-account case, which was its only remaining gap (holding off: closing tickets is user-visible Jira state, left for explicit confirmation)
