## Why

Employees need a half vacation day: 4.5 of the 9-hour standard is covered, and they still report the remaining 4.5 hours. The `halfDay` column and conflict math already exist; create/update always stored `false` and the form had no toggle (SCRUM-149 / restored SCRUM-236).

## What Changes

- `POST`/`PATCH /absences` accept `halfDay`. Allowed only for `VACATION` on a single date.
- Conflict check uses stored `hours` (not the day window) so SUM_HOURS rows of 4.5 coexist with half vacation.
- Time-report save caps allocated hours at 4.5 when that date already has half vacation.
- Absence form: type dropdown lists “חופשה - חצי יום” and “חופשה - יום מלא”; after half-day save, stay on the hours tab to finish 4.5h.
- Home KPIs count 0.5 vacation day; a half-vacation day is still “missing” until 4.5 work hours are saved.

## Capabilities

### Modified Capabilities
- `backend/absences-data-layer`: half-day is employee-writable for vacation, single day only.
- `backend/absence-conflict-validation`: remaining work is 4.5h from `TimeReport.hours`.
- `frontend-employee-home`: toggle, remainder hours, KPI.

## Impact

Backend absences + time reports; frontend absence form, month list, KPIs. No Prisma migration (`halfDay` already exists).
