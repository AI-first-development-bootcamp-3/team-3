## Why

Date pickers, timers and monthly views all need a consistent date library with Hebrew locale — without
one decided now, each Story would format dates differently or pick its own library.

## What Changes

- Confirm and formalize `dayjs` as the app's date library (see design.md — already an implicit
  dependency via Ant Design, no reason to add a second one)
- Configure Hebrew locale globally
- One sample date picker rendered to confirm Hebrew formatting works

## Scope note

This ticket's acceptance criteria also mentions a "Friday/Saturday exclusion utility for date-range
calculations." **That utility is explicitly out of scope here** — it's already a dedicated Task with its
own subtasks under the Absences epic ([SCRUM-144](https://dangutman98-1786525083697.atlassian.net/browse/SCRUM-144)).
Building it here would duplicate that work under a different owner. This change only sets up the library
and locale that SCRUM-144's utility will itself be built on top of.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `frontend-data`: adds a Hebrew-locale date formatting requirement alongside the existing types and API
  client requirements.

## Impact

`dayjs` promoted from transitive (via Ant Design) to a direct dependency. `main.tsx` or a small
`src/services/dayjs.ts` sets the global locale. No existing code changes beyond that.
