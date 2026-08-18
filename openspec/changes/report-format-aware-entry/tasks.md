## 1. Schema and migration

- [x] 1.1 Add nullable `rowStartTime` / `rowEndTime` (`@db.Time`) to
      `TimeReport` in `schema.prisma`, with a comment stating that
      `startTime`/`endTime` remain the day window (design D1)
- [x] 1.2 Change `Project.reportFormat`'s default to `SUM_HOURS`
      (design D8)
- [x] 1.3 Generate the migration: new nullable columns plus the column-default
      change, leaving stored `reportFormat` values untouched (design D8)
- [x] 1.4 Run the migration and confirm existing `time_reports` rows are
      untouched with both new columns `NULL`

## 2. Shared window math

- [x] 2.1 Add `minutesIntoWindow(dayStart, clock)` to
      `backend/src/lib/attendanceWindow.ts` — minutes elapsed from the day
      start on the overnight-aware axis (design D4)
- [x] 2.2 Add `intervalsOverlap(a, b)` using half-open comparison so
      touching endpoints do not clash (design D5)
- [x] 2.3 Unit-test both against the spec's window cases, including the
      `22:00`–`06:00` overnight day and the `13:00`/`13:00` touch case
- [x] 2.4 Mirror both helpers in `frontend/src/components/ManualReport.schema.ts`
      (or a shared frontend lib alongside `attendanceWindowHours`) so the form
      and the service agree on what fits

## 3. Backend contract

- [x] 3.1 Loosen the row schema in `timeReport.schema.ts` to the permissive
      union: optional `hours`, optional `rowStartTime`/`rowEndTime`, all
      format-independent checks unchanged (design D2)
- [x] 3.2 Apply the same shape to the single-report body in
      `createTimeReportBodySchema`
- [x] 3.3 Add `reportFormat` to the project `select` in the existing
      hierarchy-resolution query in `timeReport.service.ts`
- [x] 3.4 Reject rows whose fields contradict their project's format, with
      `rows.<index>.<field>` details

## 4. Backend rules

- [x] 4.1 Derive `hours` for `CLOCK_IN_OUT` rows from their interval, rounded
      half-up to one decimal; reject a zero-length interval; exempt derived
      values from the `0.5` floor (design D3)
- [x] 4.2 Enforce that each clock-in/out row's interval sits inside the day
      window on the minute axis, rejecting starts before / ends after
- [x] 4.3 Enforce that no two clock-in/out rows of a day overlap, naming
      every clashing row in the `400` details
- [x] 4.4 Include derived hours in the existing sum-versus-window check
- [x] 4.5 Persist `rowStartTime`/`rowEndTime` for clock-in/out rows and leave
      them `NULL` for sum-hours rows
- [x] 4.6 Return the row times in `TimeReportDto` / list responses

## 5. Reporting options

- [x] 5.1 Add `reportFormat` to `ReportingProjectOption` and to what
      `listReportingOptions` selects and returns
- [x] 5.2 Update the Swagger annotations for `POST /reports`,
      `POST /reports/batch`, and `GET /me/reporting-options`

## 6. Frontend types and client

- [x] 6.1 Add `reportFormat` to `ReportingProjectOption` and row times to
      `Report` / `ReportRowInput` in `frontend/src/types/report.ts`
- [x] 6.2 Send the format-appropriate fields per row from
      `frontend/src/services/reports.ts`

## 7. Form validation

- [x] 7.1 Convert `manualReportSchema` into `buildManualReportSchema(options)`
      so each row's format resolves from the options tree (design D7)
- [x] 7.2 Require `hours` on sum-hours rows and a valid non-zero clock pair on
      clock-in/out rows
- [x] 7.3 Add the containment error (row outside the day window) and the
      overlap error, both in Hebrew, marking every clashing card
- [x] 7.4 Count derived hours alongside typed hours in the
      sum-versus-window check and the footer total
- [x] 7.5 Update `ManualReport.schema.test.ts` for all of the above

## 8. Form UI

- [x] 8.1 Render `כניסה` / `יציאה` inputs on a clock-in/out card and the
      `שעות` field on a sum-hours card in `ManualReportProjectCard.tsx`
- [x] 8.2 Show the derived hours as read-only text on a clock-in/out card
- [x] 8.3 Clear the time fields that no longer apply when a card's project
      changes format (design D7)
- [x] 8.4 Keep the footer's allocated-versus-window progress correct on a
      mixed day in `ManualReport.tsx`
- [ ] 8.5 Confirm RTL and mobile layout of the new clock pair matches the
      existing day-level pair

## 10. Saved rows keep their format (design D6)

- [x] 10.1 Before validating a batch, load the rows already stored for that
      user and date and key them by project + task
- [x] 10.2 Validate a matched row under its stored format (clock pair present
      or not), and an unmatched row under its project's current format
- [x] 10.3 Mark each rehydrated form row with the format it loaded as, and
      render and validate it that way instead of the project's current format
- [x] 10.4 Drop that mark when a card's project changes, so it follows the
      newly chosen project
- [x] 10.5 Backend tests: old hours row survives a switch to clock-in/out,
      old clock row survives a switch to sum-hours, a newly added row on the
      same day still follows its project's current format
- [x] 10.6 Frontend tests: a saved card renders in its own format after the
      project changed, and changing the card's project drops the mark

## 9. Verification

- [x] 9.1 Backend tests: each format accepted with its own fields, each
      rejected when carrying the other's, mixed day accepted
- [x] 9.2 Backend tests: containment (before / after / spanning / overnight),
      zero-length interval, overlap rejected, touching intervals accepted
- [x] 9.3 Backend tests: derived hours value and rounding, `0.3` accepted
      below the typed floor, derived hours counted against the window
- [x] 9.4 Backend test: `GET /me/reporting-options` returns each project's
      format
- [x] 9.5 Frontend tests: card renders per format, switching project swaps
      inputs and clears stale values, overlap and containment errors block
      the save
- [ ] 9.6 Manual: set one project to `כניסה/יציאה` and another to
      `סיכום שעות` in `AdminHourSettings`, report both on one day, reload the
      day and confirm it rehydrates correctly
- [x] 9.7 Manual: confirm a newly created project defaults to `סיכום שעות`
      and that seeded formats survived the migration (design D8)
