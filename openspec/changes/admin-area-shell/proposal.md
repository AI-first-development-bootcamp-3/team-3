## Why

SCRUM-64: the admin section needs a container that all five (soon six, with
SCRUM-215) management screens live in, with its own navigation and a route
guard that redirects non-admins instead of showing a blank/forbidden screen.
Today `/admin` is a single route rendering `Admin.tsx`, a stub that just
inlines `CreateUserForm` directly — there's no sub-navigation for
clients/projects/tasks/assignments, and `RequireRole`'s current behavior on
mismatch is to render "Forbidden - {role} role required." in place, not
redirect.

Depends on: SCRUM-40 (auth routing), SCRUM-15 (folder structure/routing) —
both already shipped and archived (`openspec/changes/archive/2026-08-13-scrum-40-auth-routing`,
`.../2026-08-13-scrum-15-folder-structure-routing`).

## What Changes

- New nested routes under `/admin` in `frontend/src/routes.tsx`: `/admin`
  (landing/overview), `/admin/users`, `/admin/clients`, `/admin/projects`,
  `/admin/tasks`, `/admin/assignments` — each still wrapped by the existing
  `RequireAuth` + `RequireRole role="admin"` guards
- New `AdminShell` component (replaces the current inline `Admin.tsx` stub):
  renders the admin sub-navigation and an `<Outlet />` for the nested routes,
  RTL, usable on mobile
- Admin nav includes a slot for month-closing (SCRUM-8), rendered but
  unlinked/disabled — that story owns wiring it up, not this one
- **MODIFIED**: `RequireRole` changes from rendering an in-place "Forbidden"
  message to redirecting a mismatched-role user away from `/admin/*`
  entirely, per SCRUM-64's acceptance criteria ("redirected, not shown a
  blank screen")
- `CreateUserForm` moves from being inlined in `Admin.tsx` to living under
  the new `/admin/users` route (mechanical move; SCRUM-67 owns building out
  that screen's full CRUD)

### Non-goals

- The actual CRUD screens behind each nested route (clients/projects/tasks/
  assignments list+form UI) — those are SCRUM-67 through SCRUM-71, each
  depending on this shell existing first
- Wiring the month-closing nav item — SCRUM-8, out of this epic

## Capabilities

### New Capabilities

- `frontend-admin-shell`: the admin section's navigation container, nested
  routing, and role-guard redirect behavior

### Modified Capabilities

- `frontend-auth-routing`: `RequireRole`'s mismatch behavior changes from
  in-place message to redirect

## Impact

- `frontend/src/routes.tsx`: nested admin routes
- `frontend/src/pages/Admin.tsx` → replaced by `frontend/src/components/AdminShell.tsx`
  (or equivalent) + per-screen page files under `frontend/src/pages/admin/`
- `frontend/src/components/RequireRole.tsx`: redirect instead of inline message
- `frontend/src/pages/Layout.tsx`: no change expected — the existing top-level
  `ניהול` nav item continues to link to `/admin`
