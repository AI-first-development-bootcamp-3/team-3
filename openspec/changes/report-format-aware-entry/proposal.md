## Why

`admin-report-format` gave every project a `reportFormat` (`SUM_HOURS` /
`CLOCK_IN_OUT`) and shipped the admin screen that sets it (`סוג דיווח` —
`סיכום שעות` / `כניסה-יציאה`), but it deliberately stopped there: its own
task 4.4 files "the employee report form still needs to branch on this
setting" as follow-up. Today the setting is inert. Whatever a manager picks,
`ManualReport` asks every project row for a plain `שעות` number, so a client
that tracks attendance per project gets a number someone rounded in their
head instead of the clock pair they asked for.

This closes that gap: the daily report form and `POST /reports/batch` read
the project's format and collect what it says to collect.

## What Changes

- `GET /me/reporting-options` returns `reportFormat` on each project, so the
  form knows which inputs to render before the user types anything.
- A project row for a `SUM_HOURS` project is unchanged — one `שעות` number,
  0.5-to-24, one decimal place.
- A project row for a `CLOCK_IN_OUT` project instead collects its own
  `כניסה` / `יציאה` pair. Its `hours` are **derived** from that interval,
  never typed.
- A clock-in/out row's interval MUST fall inside the day-level כניסה–יציאה
  window (overnight-aware, same axis as the window itself). The day window
  stays exactly where it is, as the outer bound for the whole day.
- One day MAY mix both kinds — an employee assigned to a `סיכום שעות`
  project and a `כניסה/יציאה` project reports both on the same date, each
  card rendering its own inputs.
- Two clock-in/out rows on the same day whose intervals **overlap** are
  rejected with an error naming the clashing rows. You cannot be clocked
  into two projects at once.
- The existing rule that all rows' `hours` MUST NOT exceed the day window
  still holds, with derived hours counting toward that sum.
- The server, not the client, decides which shape a row must take: it looks
  up each row's project format and rejects a row carrying the wrong fields.
- `Project.reportFormat`'s default flips from `CLOCK_IN_OUT` to `SUM_HOURS`.
  `admin-report-format` picked `CLOCK_IN_OUT` back when `TimeReport` had no
  hours field at all; `manual-report-inline-hours` has since made every row
  hours-based, so keeping that default would mean every project created from
  here on demands per-row clock pairs nobody asked for. Formats already
  stored are left untouched — they were chosen deliberately, and no query can
  tell a chosen `CLOCK_IN_OUT` from an inherited one.
- **BREAKING:** `POST /reports/batch` and `POST /reports` change their row
  contract. A row for a `CLOCK_IN_OUT` project MUST send `rowStartTime` /
  `rowEndTime` and MUST NOT send `hours`; a row for a `SUM_HOURS` project
  MUST send `hours` and MUST NOT send row times. A client that sends `hours`
  for every row — today's client — is rejected once any of its projects is
  set to `CLOCK_IN_OUT`.

### Non-goals

- Changing the admin screen. `AdminHourSettings` already sets the format and
  is untouched here.
- Re-deriving history. Rows saved before this change keep the hours they
  were saved with, even if their project is later switched to
  `כניסה/יציאה` — see design.md.
- A per-task or per-client format. The setting stays on the project, as
  `admin-report-format` defined it.
- Absence reporting (`AbsenceReportForm`), which has no project and no
  format.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `time-reports`: project rows become format-dependent — a row is validated,
  shaped, and rendered according to its project's `reportFormat`; row-level
  clock pairs gain containment and overlap rules; reporting options carry
  the format.

## Impact

- `backend/prisma/schema.prisma` + migration: `TimeReport` gains nullable
  `rowStartTime` / `rowEndTime`. `startTime` / `endTime` keep their current
  meaning — the day window, copied onto every row — so existing rows and the
  form's day-window read stay valid. `Project.reportFormat`'s default becomes
  `SUM_HOURS`, with a backfill for existing rows.
- `backend/src/types/timeReport.schema.ts`: row schema splits into two
  shapes; batch body validation gains the format-driven branch.
- `backend/src/services/timeReport.service.ts`: look up project formats for
  the submitted rows, derive hours, enforce containment and overlap, return
  `reportFormat` in reporting options and row times in list/DTO output.
- `backend/src/lib/attendanceWindow.ts`: containment and overlap helpers on
  the existing overnight-aware minute axis.
- Swagger annotations on `POST /reports`, `POST /reports/batch`,
  `GET /me/reporting-options`.
- `frontend/src/types/report.ts`, `frontend/src/services/reports.ts`:
  `reportFormat` on project options, row times on the batch input.
- `frontend/src/components/ManualReport.schema.ts`: per-row discriminated
  validation, containment and overlap messages in Hebrew.
- `frontend/src/components/ManualReportProjectCard.tsx`,
  `ManualReport.tsx`: render the clock pair or the hours field per project,
  and keep the footer's allocated-versus-window total correct across both.
