## Context

See proposal.md - Why. `/admin` currently renders `Admin.tsx` directly with
`CreateUserForm` inlined — no sub-navigation, no nested routes.
`RequireRole.tsx` currently renders an in-place "Forbidden" message on
mismatch rather than redirecting. `Layout.tsx` already provides the
top-level app chrome (its own `Menu`, RTL) that this shell nests inside via
the existing `/admin` route entry — this change does not touch `Layout.tsx`.

**Figma reference:** per the epic's UI-fidelity requirement, this shell's
visual implementation must match Dan's Figma file pixel-for-pixel. The file
has not been shared yet — flagging here as required before the visual
implementation (not the routing/guard logic) proceeds. Dan: please share the
Figma link or the relevant frame/page names covering the admin area shell.

## Goals / Non-Goals

**Goals:**
- Nested routing under `/admin` for the five (soon six) management screens
- One shared admin nav + layout component all of them render inside
- Redirect (not in-place message) for role-mismatch on `/admin/*`

**Non-Goals:**
- Building any of the CRUD screens themselves — placeholder/empty route
  targets are enough for this change; SCRUM-67-71 fill them in
- Visual pixel-matching to Figma — blocked on the file being shared (see
  Context); routing/guard/nav-structure logic in this change is not blocked
  on it and can proceed with placeholder styling

## Decisions

**Nested React Router routes under `/admin`, guard applied once at the
parent.** `RequireAuth` + `RequireRole` wrap the parent `/admin` route
element; all nested children inherit the guard via `<Outlet />` rather than
each screen re-wrapping itself. Matches the existing pattern in
`routes.tsx` where guards wrap route elements, not page components.

*Alternative considered:* guard each nested route individually. Rejected —
duplicates the same two wrapper components five times for no behavioral
difference.

**`RequireRole` redirects to `/` instead of rendering inline text.**
SCRUM-64's acceptance criteria explicitly reject "shown a blank screen" for
non-admins; redirecting to the app's home route (already the destination for
an authenticated non-admin) is consistent with how `RequireGuest` already
redirects authenticated users away from `/login`.

*Alternative considered:* redirect to a dedicated `/forbidden` page.
Rejected — no such page exists and the acceptance criteria don't ask for
one; redirecting home is the smaller, already-established pattern.

**`CreateUserForm`'s move to `/admin/users` is a placeholder wiring, not a
rebuild.** This change relocates the existing component under the new route
structure without altering its behavior — SCRUM-67 is where the `/admin/users`
screen gets its real list/edit/deactivate UI.

## Risks / Trade-offs

- [Redirecting non-admins to `/` instead of showing any message could read
  as silent/confusing] → Acceptable per SCRUM-64's explicit acceptance
  criteria; no additional messaging requested, and the home route is
  reachable content, not a blank page.
