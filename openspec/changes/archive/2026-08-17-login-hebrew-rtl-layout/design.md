## Context

See proposal.md — Why.

The relevant existing state:

- `RequireAuth` is a route-level wrapper component in `routes.tsx`. Beyond the session check it also
  enforces the forced-password-change rule: a user with `mustChangePassword` is redirected to
  `/change-password` from any other protected route.
- `Login.tsx` performs its own post-login navigation: `navigate(user.mustChangePassword ?
  '/change-password' : from, { replace: true })`, where `from` is the protected path the user was
  bounced off, carried in `location.state`.
- `/login` is currently a public child of the `Layout` route, with no guard of any kind.
- Hebrew copy elsewhere in the app is written inline in JSX; there is no strings module or i18n
  library anywhere in the codebase.

## Goals / Non-Goals

**Goals**

- Add the guest guard without disturbing the existing post-login navigation, including the
  `mustChangePassword` branch and the `from` return path.
- Keep the guard reusable — SCRUM-60 (logout) and any future public-only route will want the same
  thing.

**Non-Goals**

- No visual design. See proposal.md.
- No change to the login request, response, session storage, or the messages shown on failure.
- Not introducing a strings/i18n abstraction. See the decision below.

## Decisions

### Guest guard as a `RequireGuest` route wrapper, not logic inside `Login.tsx`

Mirrors the existing `RequireAuth` / `RequireRole` pattern: a small component that reads the session
store and returns `<Navigate replace />` or its children, applied in `routes.tsx`. It is reusable for
SCRUM-60 and keeps `Login.tsx` about the login form.

*Alternative considered:* a `useEffect` redirect inside `Login.tsx`. Rejected — it renders the form
for one frame before redirecting, and it buries a routing concern in a form component while the
codebase already has an established place for route guards.

### The guard must not hijack the post-login navigation

This is the subtle part. `Login.tsx` calls `setSession(...)` and then `navigate(...)`. Once the
session exists, `RequireGuest` — which is wrapping the very component doing the navigating — becomes
eligible to redirect. If the guard's redirect wins, two things break: a `mustChangePassword` user
lands on `/` instead of `/change-password`, and a user who was bounced off `/absences` loses that
return path.

In practice `navigate()` runs synchronously in the same statement sequence as `setSession()`, before
React re-renders, so the explicit navigation wins. Relying on that ordering alone is fragile.

**Decision:** `RequireGuest` redirects using the *same* destination logic as `Login.tsx` — honour
`location.state.from` when present, and send a `mustChangePassword` user to `/change-password`. Then
whichever path executes first, the destination is identical and the ordering stops mattering. Tests
must cover the `mustChangePassword` and `from` cases going through the guard, not just the happy path.

*Alternative considered:* applying `RequireGuest` in `routes.tsx` around `<Login />` but having it
redirect unconditionally to `/`. Rejected — correct only by accident of React's batching, and it
silently discards `from`.

### Hebrew copy written inline, no strings module

Matches every other Hebrew surface in the repo (`ReportEntryForm.tsx`, `Reports.tsx`, `Layout.tsx`).
A `Login.strings.ts` was considered and rejected: it would be the only file of its kind, so it would
read as an abandoned convention rather than an established one, and the product is Hebrew-only with
no second locale planned.

### `/login` stays nested inside `Layout`

Leaving it there means a logged-out user still sees the דיווח שעות / היעדרויות / ניהול nav above the
form. This is a real wart — those links just bounce back to `/login` — but no ticket covers it, and
it is presentation, which this change explicitly excludes. Recorded here rather than fixed so the
decision is visible and easy to reverse; it belongs with the login visual shell ticket.

### `dir="ltr"` on the email and password inputs only

Scoped to the two fields whose values are Latin script. The page and every label stay RTL. Applied at
the input level rather than by overriding direction on a container, so nothing else inherits it.

## Risks / Trade-offs

- **The guard changes behaviour on a route with nine existing tests** → All nine are being rewritten
  for Hebrew anyway, so the guard's cases get added in the same pass rather than bolted on later.
- **Double redirect for a `mustChangePassword` user** (guard → `/change-password`, or guard → `/` →
  `RequireAuth` → `/change-password`) → Mitigated by giving the guard the same destination logic, so
  it resolves in one hop. Worth asserting in a test that the user lands on `/change-password`.
- **Constraining the form's width could look odd against the unstyled `Layout` chrome** → Accepted.
  The page is visibly unfinished today either way, and the visual shell ticket will supersede this
  layout work.
- **Hebrew test queries are more brittle than English ones** — a copy tweak breaks a test → Accepted;
  it is the same trade-off every other Hebrew-tested component in the repo already makes.

## Migration Plan

Not applicable. Frontend-only, no persisted data, no API contract change. Rollback is reverting the
commit.

## Open Questions

None. The visual shell and the `Layout` nesting are deliberately deferred to a separate ticket, not
unresolved within this change.
