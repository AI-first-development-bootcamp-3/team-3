## Context

See `proposal.md` — Why. The relevant existing state:

- `RateLimitStore` ([`src/services/rateLimitStore.ts`](../../../backend/src/services/rateLimitStore.ts)) holds failure timestamps in a per-process `Map`, pruned by a rolling window. Its own header comment records the accepted trade-off: counters are lost on restart and are not shared across replicas.
- `rateLimit` middleware ([`src/middleware/rateLimit.middleware.ts`](../../../backend/src/middleware/rateLimit.middleware.ts)) checks thresholds before the handler and updates counters in a `res.on('finish')` hook, keying on `401` for failure and `200` for success. A `400` never reaches it — `validate` rejects earlier — so malformed bodies never count.
- `requestLogger` ([`src/middleware/requestLogger.middleware.ts`](../../../backend/src/middleware/requestLogger.middleware.ts)) already emits one pino record per request at `warn` for any 4xx, with a correlation id, redacting `req.body.password` among others. It carries no email and no notion of an attempt.
- Login already returns `401` uniformly for wrong password, unknown email, and inactive account, and `429` when throttled. The login page branches on exactly those two plus a generic fallback.

The deployment target is Docker Compose with one Postgres and, today, one backend container.

## Goals / Non-Goals

**Goals:**

- Lock decisions that survive a restart and would agree across replicas.
- An attempt record that is worth reading months later, without becoming a place secrets leak to.
- Reuse the existing middleware seam rather than opening a second one.

**Non-Goals:**

- Replacing the in-memory throttle. Tier 2 stays exactly as built; this adds tier 3 above it. Two independent mechanisms with different persistence characteristics is the point, not an accident to be tidied up later.
- An admin unlock action, an unlock email, or a CAPTCHA step-up.
- A queryable admin UI over the audit trail. The table is readable by whoever has database access; building a screen for it is separate work with no ticket behind it.

## Decisions

### Derive the lock from recorded attempts, not from a stored lock flag

A `lockedUntil` column would need writing at the moment the threshold is crossed, which means the write and the count must agree under concurrency, and a missed write leaves an account that should be locked unlocked. Counting rows in a window makes the lock a pure function of the audit trail: there is one source of truth, and the trail that justifies a lock is the same data that produces it.

The cost is a query per attempt instead of a column read. With an index on `(email_normalised, created_at)` this is a bounded index scan on a table that only receives writes on failed logins, which is not a hot path.

*Alternative considered:* `users.failedAttempts` + `users.lockedUntil`. Rejected primarily because it cannot represent an unregistered email — see the next decision — and secondarily because it makes the audit trail a separate, droppable side-effect rather than the mechanism itself.

### Key on the submitted email string, with a nullable user reference

The lock key is the normalised email text. `user_id` is recorded when the email resolves, but nothing keys off it.

This is the decision that preserves non-enumeration. A lock hung off a user row can never fire for an email with no account, so "does this email eventually start responding differently?" would answer "is this email registered?" — which is precisely the question `backend/login-rate-limiting` promises the login endpoint never answers. Storing `user_id` alongside is still worth it: it makes the trail joinable for review, and it costs nothing because no decision reads it.

Normalisation is trim + lowercase, matching `normaliseAccountKey` in the existing rate-limit middleware so the two tiers bucket identically.

### `423 Locked`, distinct from `429`

`423` is semantically exact and lets the login page word the two conditions differently — which SCRUM-189 requires, since only the lock has a duration worth counting down.

This does reveal *which defence fired*, but not *whether the account exists*: both tiers key on the submitted email, so a registered and an unregistered email walk the same 401 → 429 → 423 path. Distinguishing throttle from lock tells an attacker only that they have been slowed, which they can already infer from being slowed.

*Alternative considered:* reuse `429` with a distinct error code in the body. Rejected as strictly worse for the client — same information disclosure, but the page has to inspect the payload to pick a message.

### Count failures since the most recent success

"A successful login clears that email's failures" is implemented as a query bound, not a delete: count failures with `created_at` greater than the most recent success for that email. Successes are therefore recorded too.

Deleting rows on success would let an attacker erase their own trail by eventually guessing correctly — the one case where the trail matters most. Append-only is what makes this an audit log rather than a counter that happens to be in a database.

### Record the normalised email in plaintext

The trail is not useful without knowing which account was targeted, and hashing would defeat the review it exists for.

The accepted risk is a user typing their password into the email field, which would then be stored. Mitigation is bounded rather than eliminated: the value is stored in one column of one table rather than sprayed through log aggregation, and the pino redaction that already covers `req.body.password` is untouched. Flagged in `proposal.md` and accepted deliberately for a system of this size.

*Alternative considered:* store a salted hash of the email. Rejected — it makes the audit trail unreadable to a human reviewer, which is the trail's only consumer here.

### Hook into the existing `res.on('finish')` seam

Attempt recording goes where throttle counting already happens, so there is one place that decides what an attempt outcome was. The lock *check* goes in front of the handler alongside the throttle check, so a locked request is refused before `bcrypt.compare` runs.

Writing from the `finish` hook means the response is already sent when the row is written — the write is off the response path, and a failed write cannot turn a `401` into a `500`. It must therefore be error-handled locally and logged, never left to reject unhandled.

## Risks / Trade-offs

- **A DB write on every failed login is a write-amplification lever.** An attacker who cannot get in can still make the service write rows. → The per-IP throttle already caps attempts long before volume matters, and refusals at tiers 2 and 3 are cheap to record. Worst case is bounded by the throttle, not by the attacker.
- **The table grows without bound.** → An index on `(email_normalised, created_at)` keeps reads flat regardless of size. Retention/pruning is deliberately not specified; add a sweep only if the table becomes large enough to matter, which for this deployment it will not.
- **A locked email is a denial-of-service vector against a known user.** Anyone who knows an employee's email can lock them out for the configured duration by failing enough times. → This is inherent to account lockout and is exactly why the duration is short (30 minutes) and self-expiring rather than admin-cleared. It is also why the threshold sits well above the throttle's: reaching it requires sustained deliberate effort, and the throttle makes that effort slow.
- **Two tiers with different persistence can disagree after a restart.** The in-memory throttle resets; the lock does not. A user can be locked while the throttle believes them clean. → Not a defect: the stricter tier wins, which is the intended ordering. Worth stating so it is not later "fixed".
- **Clock skew across replicas would shift window boundaries.** → All timestamps are database-generated, so a single clock governs.
- **`req.ip` is the Docker bridge gateway unless `TRUST_PROXY` is set.** The recorded client address inherits this existing limitation. → Already documented in `login-rate-limiting`'s design; the address column is for review, and no lock decision keys on it.

## Migration Plan

One additive migration creating `login_attempts`. No existing table is altered, no data is backfilled, and nothing reads the table until the new code paths ship — so the migration is safe to apply ahead of the application change.

Rollback is a code revert; the table can be left in place, inert. Reverting the migration is only needed if the table itself is unwanted, and it drops the audit trail with it.

## Open Questions

- Retention for `login_attempts`. Deferrable: it changes no requirement, no interface, and no task here — only whether a sweep job is added later once real volume is known.
