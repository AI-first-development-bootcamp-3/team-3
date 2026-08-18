## Why

Employees cannot yet record hours: there is no `TimeReport` table, no create API, and `/` is a placeholder. SCRUM-114 (under epic SCRUM-6) is the first slice — one daily report, saved — and it unblocks validation, multi-row, edit, and monthly views.

## What Changes

- Prisma `TimeReport` model plus `WorkLocation` enum; migration
- `POST /reports` (JWT required) creates a report for `req.user.sub`
- `GET /me/reporting-options` returns the active client → project → task tree for the form (not assignment-filtered; SCRUM-71 will add that)
- Hebrew report entry form on `/` with cascading dropdowns, save, success feedback, and form reset
- Replace the provisional frontend `Report` type (`hours` / `notes`) with start/end, location, and hierarchy ids

### Non-goals

- Assignment filtering of dropdowns (SCRUM-71)
- 9h under/over warnings and remaining-hours UX (SCRUM-115 / 117)
- Listing several rows on the home screen (SCRUM-116)
- Edit, monthly calendar/list, timer, month lock

## Capabilities

### New Capabilities

- `time-reports`: Authenticated create of a single daily time report and nested reporting-options for the entry form

### Modified Capabilities

- (none — `frontend-forms` / `frontend-data` patterns are reused, not changed at spec level)

## Impact

- Backend: Prisma schema/migration, new route/controller/service/Zod, factories, route tests, Swagger
- Frontend: `Reports` page, form component + schema, `services/reports.ts`, types
- Jira: SCRUM-114 / 121–124 (tests in each PR, not a separate 124 PR)
