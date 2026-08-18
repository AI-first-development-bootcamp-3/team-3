## Context

See proposal.md - Why, including the open item on default format. This is a
small, additive schema change layered onto the already-existing
`admin-manage-projects` screen rather than a new admin area.

## Goals / Non-Goals

**Goals:**
- Make report format a per-project setting, editable from the existing
  projects screen
- Zero-migration-risk default (see proposal.md's Open item)

**Non-Goals:**
- Building the employee-facing conditional form fields — SCRUM-114/115's
  follow-up, only flagged here

## Decisions

**`reportFormat` lives on `Project`, not `Client`.** The Figma mockup and
Jira description both frame this as per-project ("per client/project"
phrasing, but the mockup's table is client + project + report type — one
row per project). A project inherits no client-level default; each project
sets its own.

*Alternative considered:* a client-level default that projects can
override. Rejected — not asked for, adds a fallback-resolution rule with no
stated requirement driving it.

**Surfaced on the existing `/admin/projects` screen, not a new route.**
SCRUM-215 doesn't ask for a separate admin destination — the Jira
description's mockup is a table of client + project + report type, which
is the existing project list with one more column/field, not a new screen.

## Risks / Trade-offs

- [If Dan wants `SUM_HOURS` as the default instead of `CLOCK_IN_OUT`, this
  is a one-line change in the migration's `@default(...)` before it's
  applied] → Flagged explicitly in proposal.md; safe to change up until the
  migration is actually run.
