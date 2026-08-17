## Why

SCRUM-65: one table and one form pattern shared by all five (soon six)
admin screens, so they don't diverge as each of SCRUM-67 through SCRUM-71
and SCRUM-215 gets built independently. `frontend-forms` already covers
schema-driven validation generically, but nothing yet standardizes the
admin-specific concerns: a sortable, RTL, mobile-readable list/table, and
the active/inactive-toggle + delete-confirmation flow every admin entity
form needs.

Depends on: SCRUM-36 (UI library), SCRUM-37 (forms) — both already shipped
and archived (`openspec/changes/archive/2026-08-13-scrum-36-ui-library`,
`.../2026-08-13-scrum-37-forms`).

## What Changes

- New shared `AdminEntityTable` component: sortable columns, RTL, readable
  on mobile — used by list views for users/clients/projects/tasks
- New shared `AdminEntityForm` pattern: wraps the existing schema-driven
  form pattern (`frontend-forms`) with two additions every admin entity form
  needs — an active/inactive toggle, and a delete-confirmation flow before
  an entity is soft-deleted
- Both patterns proven by wiring at least two of the upcoming admin screens
  to them (per SCRUM-65's acceptance criteria) — this happens as those
  screens (SCRUM-67+) are built, not in this change itself, since this
  change has no screen to attach to yet on its own

### Non-goals

- Any specific admin screen (users/clients/projects/tasks/assignments) —
  those are separate stories that consume these patterns
- New validation logic beyond what `frontend-forms` already provides — this
  change adds structure (toggle + confirm flow) around it, not new
  validation rules

## Capabilities

### New Capabilities

- `frontend-admin-crud-patterns`: the shared table and form-with-toggle-and-
  confirm pattern every admin CRUD screen builds on

## Impact

- New: `frontend/src/components/AdminEntityTable.tsx`
- New: `frontend/src/components/AdminEntityForm.tsx` (or equivalent
  composable pattern, e.g. a hook + wrapper) building on the existing
  schema-driven form components (`CreateUserForm`, `SampleForm` as
  reference)
- No existing screens changed by this proposal directly — consumed by
  SCRUM-67 through SCRUM-71 and SCRUM-215
