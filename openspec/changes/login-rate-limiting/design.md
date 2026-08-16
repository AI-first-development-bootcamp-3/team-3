## Context

See `proposal.md` — Why. The relevant current state:

- `POST /login` and `PATCH /me/password` are the only credential-handling routes, both on `authRouter`, both already fronted by `validate({ body })`.
- `app.ts` composes helmet → cors → requestLogger → json → routers. No `trust proxy`, so under `docker-compose` `req.ip` is the bridge gateway for every request.
- `AppError` is the single error type; `errorHandler` serialises it. There is no `429` factory and no path that sets a response header on an error.
- The deployment is one backend container. There is no Redis, and adding one was considered and rejected (see Decisions).
- `login()` throws an identical `AppError.unauthorized` for unknown email, wrong password, and inactive account — a property the specs protect and this design must not erode.

## Goals / Non-Goals

**Goals:**
- Throttle without changing the observable behaviour of a *non-throttled* request in any way.
- Keep the throttle decision out of `auth.service.ts`, so the service stays a pure credential check.
- Make time injectable so the window and expiry are testable without real waiting.

**Non-Goals:**
- Surviving a process restart, or working across more than one replica. See Risks.
- Account lockout (SCRUM-188) — sticky state and an admin unlock path are a different mechanism.
- Throttling any other route. This is not a general-purpose API rate limiter.
- CAPTCHA, exponential backoff, or progressive delay.

## Decisions

### In-memory store, not Postgres or Redis

**Chosen:** a module-level `Map` in the backend process.

Postgres would mean a migration, a write on every failed attempt, and a cleanup job for expired rows — real cost for a mechanism that is a hint, not a security boundary. Redis is the conventional answer and brings TTL expiry for free, but it adds a service to `docker-compose`, a dependency, a connection-failure mode, and a decision about what to do when it is down (fail open and lose protection, or fail closed and lock everyone out).

The team accepted the in-memory trade-off explicitly. The limitations are recorded in Risks and must be carried into the ticket, not discovered later.

### Rolling window over timestamps, not a fixed-window counter

Each key maps to a list of failure timestamps. On each check, entries older than the window are pruned; the throttle trips when the remaining count reaches the threshold.

A fixed-window counter (`count` + `resetAt`) is cheaper but has the classic boundary flaw: an attacker gets `threshold` attempts at the end of one window and `threshold` again immediately at the start of the next, doubling the effective rate at the seam. At these volumes — a handful of timestamps per key — the list costs nothing and removes the flaw.

It also makes `Retry-After` exact: the oldest surviving timestamp plus the window, minus now.

### Check before, record after — via response status, not a service callback

The middleware runs before the handler and rejects with `429` if a threshold is already met. Recording a failure has to happen *after*, because whether an attempt failed is only known once the handler has run.

**Chosen:** the middleware hooks the response and records a failure when the final status is `401`; a `200` clears the email's failures.

The alternative — having `auth.service.ts` call a `recordFailure()` — couples the service to the throttle and means every future caller of `login()` must remember to do it. Reading the status keeps the throttle a self-contained middleware.

Consequences to get right:
- **`400` must not count.** A malformed body never reached a password comparison; counting it would let a client burn its own quota on typos and would fire on schema changes. `validate` runs first and returns `400`, so ordering the throttle middleware *after* `validate` gives this for free.
- **On `/me/password`, a `401` means a bad or missing token, not a wrong password** — there is no old-password check on that route, so an authenticated caller's request cannot itself fail; only `authenticate` rejecting it can produce a `401`. That has a sharper consequence than it first looks like: `authenticate` responds directly on failure without calling `next()`, so **anything wired after it — including this middleware — never runs for that request at all.** The only way the limiter can see this route's one and only failure mode is to run *before* `authenticate`, not after it (revised from the original plan of `authenticate → validate → rate-limit`, caught while writing the route tests in tasks 5.7). See the next decision for what that means for the account key.

### Two independent keys, evaluated in one middleware — except `/me/password`, which only has one

Email and address counters live in the same store under namespaced keys (`account:<normalised>` / `address:<addr>`). One middleware checks both and rejects on whichever trips first, so a request never consumes two different rejection paths.

`/login` has a real account key (the submitted email) available before the handler runs. `/me/password` does not: running the limiter before `authenticate` (previous decision) means no verified identity exists yet, and the body carries no email. Reading a `sub` out of the token *without* verifying it was considered and rejected — an unverified claim is exactly as attacker-chosen as a spoofed `X-Forwarded-For`, so keying on it would look like per-account protection while providing none (an attacker can pick a fresh claimed identity every request). `/me/password` therefore throttles on address alone. The account-key parameter on the middleware is optional for exactly this case.

**The email key must be normalised — trimmed and lowercased — before use.** Without it, `Foo@example.com` and `foo@example.com` are separate buckets and the per-email threshold is bypassed by varying capitalisation. This is the single easiest way to ship a throttle that does nothing.

### `TRUST_PROXY` as configuration, defaulting to disabled

`app.set('trust proxy', value)` accepts a boolean, a hop count, or a list. The env var is a string, parsed into whichever form Express expects.

**Default: disabled.** There is no default that is right for both environments — trusting a proxy that is not there lets any client set `X-Forwarded-For` and choose its own bucket, while disabling it behind a real proxy collapses every request into the proxy's address. Disabled is the safe half of that trade: it matches current behaviour exactly, changes nothing on deploy, and fails toward a *degraded* address leg rather than a *forgeable* one. A deployment that acquires a proxy sets the variable.

### Per-address threshold derived from the per-email one

**Chosen: 50 failures per 15 minutes**, against 5 per email over the same window.

The number is not arbitrary: it is the email threshold multiplied by the number of people plausibly sharing one address (~10, the team behind a shared office NAT). Deriving it this way means the address leg cannot fire before the email leg during legitimate use — ten colleagues would each have to exhaust their own five attempts before the address trips. It only engages for the case it exists to catch: one host spraying across many accounts.

If the team's network shape changes — everyone remote on separate connections, or the office growing — this number should be re-derived from the same formula rather than nudged.

### Injectable clock

The store takes a `now()` function defaulting to `Date.now`. Window expiry and `Retry-After` are the behaviours most worth testing and the least pleasant to test against a real clock.

## Risks / Trade-offs

**Counters reset on restart and deploy** → An attacker who can trigger or wait for a restart gets a fresh quota. Accepted: for an internal timesheet app the throttle raises attacker cost rather than providing a guarantee. Record it in the ticket so nobody later assumes it is a hard limit.

**Per-process, so scaling past one replica silently weakens the throttle** → With N replicas each keeps its own counters, giving an attacker roughly N× the attempts. Nothing fails visibly. Mitigate by noting it in `backend/README.md` next to the throttle config, so the constraint is visible at the point where someone would change replica count.

**Unbounded map is a memory-exhaustion vector** → An attacker submitting a million distinct emails creates a million keys. This turns a brute-force defence into a DoS surface. Mitigate with both a periodic sweep of expired entries and a hard cap on entry count, evicting the oldest when the cap is hit. The cap must be chosen so that eviction under attack cannot flush a legitimate user's active counter early enough to matter.

**A shared office NAT address makes everyone one bucket** → Addressed by deriving the address threshold from the email one (50 = 5 × ~10 people), so the address leg cannot trip before every colleague has independently exhausted their own allowance. The residual risk is the team outgrowing the assumed headcount, at which point the office starts throttling itself; re-derive rather than guess if the team grows.

**With `TRUST_PROXY` disabled by default, the address leg does nothing under `docker-compose`** → Every request is attributed to the bridge gateway, so all users share one bucket and the 50 threshold effectively becomes a global limit. This is the accepted cost of the safe default. The per-email leg is unaffected and remains the real protection until a deployment configures its proxy.

**Throttling could become an enumeration oracle** → If a real and a fake email diverge in status, code, message, or latency, the throttle leaks exactly what the login endpoint refuses to. Keying on the submitted string before any account lookup is what prevents this; it needs a test that asserts the two responses are identical, not just that each is a `429`.

**`Retry-After` tells an attacker precisely when to resume** → Accepted. It is the standard header, the frontend needs it to say something useful, and the timing is derivable by polling anyway.

## Migration Plan

No data migration — nothing is persisted. Deploying is a restart, which starts with empty counters (the normal steady state after any deploy).

New env vars all need defaults so an existing `.env` keeps working without edits; `.env.example` and `docker-compose.yml` document them. `TRUST_PROXY` defaults to disabled, which matches the current behaviour exactly.

Rollback is removing the middleware from the two routes; nothing else in the app depends on it.

## Open Questions

None outstanding. The two that were open — the per-address threshold and the `TRUST_PROXY` default — are resolved above under Decisions.
