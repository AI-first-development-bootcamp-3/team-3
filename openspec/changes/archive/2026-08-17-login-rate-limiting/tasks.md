## 1. Configuration

- [x] 1.1 Add the rate-limit settings to `backend/src/config/env.ts`: email threshold (default 5), address threshold (default 50), and window in seconds (default 900). Positive integers, coerced, with the address threshold required to be >= the email threshold — same `refine` pattern as the existing JWT lifetime check.
- [x] 1.2 Add `TRUST_PROXY` to `env.ts`, defaulting to disabled. Parse the string into the form `app.set('trust proxy', ...)` expects (boolean, hop count, or list).
- [x] 1.3 Apply the setting in `backend/src/app.ts` via `app.set('trust proxy', env.TRUST_PROXY)`, before the routers.
- [x] 1.4 Document all four variables in `backend/.env.example`, the root `.env.example`, and `docker-compose.yml`.
- [x] 1.5 Extend `src/config/test/env.test.ts` to cover the defaults, the threshold-ordering refinement, and `TRUST_PROXY` parsing for each accepted form.

## 2. Error contract

- [x] 2.1 Add `AppError.tooManyRequests` to `backend/src/types/errors.ts` — status `429`, a code distinct from `UNAUTHORIZED`.
- [x] 2.2 Give the error handler a way to attach `Retry-After` to a `429` response, without changing the serialised body shape for any other error.
- [x] 2.3 Cover both in `src/types/test/errors.test.ts` and the error-middleware tests.

## 3. Attempt store

- [x] 3.1 Create the in-memory store: keyed map of failure timestamps, an injectable `now()` defaulting to `Date.now`, and operations to check-and-report-remaining-wait, record a failure, and clear a key.
- [x] 3.2 Prune timestamps outside the window on every read, so the window rolls rather than resetting at a fixed boundary (design.md — Rolling window).
- [x] 3.3 Bound the store: periodic sweep of fully-expired keys plus a hard entry cap with oldest-first eviction, so a flood of distinct emails cannot exhaust memory (design.md — Risks).
- [x] 3.4 Unit-test the store against a fake clock: threshold trip, rolling-window expiry, exact remaining wait, clear-on-success, eviction under the cap, and that a check while throttled does not push the wait further out.

## 4. Middleware

- [x] 4.1 Create the rate-limit middleware. Before the handler, check both the email key and the address key and reject with `429` plus `Retry-After` if either has tripped.
- [x] 4.2 Normalise the email key — trim and lowercase — before every read and write. Without this the per-email threshold is bypassed by varying capitalisation (design.md).
- [x] 4.3 After the handler, record a failure when the final status is `401`, and clear the email's failures when it is `200`. A `400` must not count.
- [x] 4.4 Wire it onto `POST /login` and `PATCH /me/password` in `src/routes/auth.routes.ts`, positioned **after** `validate` so malformed bodies are rejected before they reach the counter.
- [x] 4.5 Comment on the `/me/password` wiring that a `401` there is a bad token rather than a wrong password — it caps token guessing, which is a different thing from password brute force (design.md).
- [x] 4.6 Document the `429` response on both routes in their OpenAPI JSDoc blocks.

## 5. Backend tests

- [x] 5.1 In `src/routes/test/auth.routes.test.ts`, assert attempts below the email threshold still return `401` and are otherwise unchanged.
- [x] 5.2 Assert the email threshold trips to `429`, that `Retry-After` is present, and that correct credentials are still refused while throttled.
- [x] 5.3 **Assert a registered and an unregistered email produce byte-identical throttled responses** — same status, code, and message. This is the enumeration-oracle guard and the test most worth getting right (design.md — Risks).
- [x] 5.4 Assert the address threshold trips at 50 failures across many distinct emails within the window, and that it does not trip at 49.
- [x] 5.5 Assert a `400` from a malformed body does not increment either counter.
- [x] 5.6 Assert a successful login clears that email's failures, and that the window elapsing restores access with no manual intervention.
- [x] 5.7 Assert `PATCH /me/password` is throttled, and that switching between the two routes does not reset the address counter.
- [x] 5.8 In `src/test/app.security.test.ts`, assert that with `TRUST_PROXY` disabled a client-supplied `X-Forwarded-For` does not change which bucket a request lands in.

## 6. Frontend

- [x] 6.1 Confirm `ApiError` from `src/services/apiClient.ts` exposes the status and error code for a `429`; extend it if it does not.
- [x] 6.2 Add a `429` branch to the `catch` in `frontend/src/pages/Login.tsx`, before the generic fallback, setting a distinct message that tells the user to wait — and says nothing about whether the email exists.
- [x] 6.3 Confirm the entered values survive the error and the form stays submittable.
- [x] 6.4 Extend `src/pages/Login.test.tsx`: the throttled message renders on a `429`, it differs from the invalid-credentials message, and the existing `401` message is unchanged.

## 7. Wrap-up

- [x] 7.1 Note in `backend/README.md`, next to the throttle configuration, that counters are in-process — they reset on restart and weaken proportionally if the backend is scaled past one replica.
- [x] 7.2 Run `npm run typecheck`, `npm run lint`, and `npm test` in both `backend/` and `frontend/`.
- [x] 7.3 Manually verify the end-to-end flow against a running stack: six wrong passwords on the login form produce the throttled message, and access returns after the window.
