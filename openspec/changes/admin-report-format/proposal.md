## Why

SCRUM-215: discovered in the Figma mockups ("הגדרת דיווחי שעות" screen), not
previously in the PRD or any existing ticket. Per client/project, the admin
chooses whether employees report time as total hours or as clock-in/clock-
out, so reporting matches how that client actually tracks work.

Depends on: SCRUM-63 (data model), `admin-manage-projects` (SCRUM-69 —
projects must exist to configure a format on them). Not dependent on
`admin-area-shell`/`admin-crud-patterns` directly, but reuses them since the
setting surfaces as part of the existing `/admin/projects` screen (see What
Changes) rather than a new top-level admin route.

**Open item — default format:** Jira flags "default format needs to be
agreed (likely clock in/out)." `TimeReport` today only has `startTime`/
`endTime` (no total-hours field exists anywhere in the schema), so
clock-in/out is both the Jira-suggested default and the one requiring zero
extra migration for existing data. This proposal adopts clock-in/out as the
default on that basis. Dan: flag here if total-hours should be the default
instead — this is a one-line schema default change if so.

## What Changes

- `Project.reportFormat` field: `SUM_HOURS` (total hours) or `CLOCK_IN_OUT`,
  default `CLOCK_IN_OUT` (see Open item above)
- Backend: extend `PATCH /admin/projects/:id` (from `admin-manage-projects`)
  to accept `reportFormat`; extend `GET /admin/projects` to return it
- Frontend: extend the existing `/admin/projects` list/edit screen (not a
  new route) to show and edit each project's report format, per client +
  project + report type, matching the Figma mockup's layout

### Non-goals

- Changing the employee daily report form (SCRUM-114) to actually render
  different fields per format — that's SCRUM-114/115's own follow-up work,
  flagged here as newly required once this ships (their current
  single-field-set assumption no longer holds), not built by this change
- A `SUM_HOURS`-specific data field on `TimeReport` — out of scope; adding
  it is SCRUM-114/115's concern when they consume this setting

## Capabilities

### Modified Capabilities

- `backend-admin-projects`: project records gain a `reportFormat` setting,
  editable the same way name/status already are

## Impact

- `backend/prisma/schema.prisma`: add `ReportFormat` enum and
  `Project.reportFormat` field + migration
- `backend/src/types/adminProject.schema.ts`,
  `services/adminProject.service.ts`: extend to accept/return
  `reportFormat`
- `frontend/src/pages/admin/AdminProjects.tsx` (from `admin-manage-
  projects`): show + edit report format per project
- Flagged, not built here: SCRUM-114/115 (employee daily report form) needs
  to read this setting and branch its rendered fields accordingly
