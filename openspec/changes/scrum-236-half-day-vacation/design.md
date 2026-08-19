## Context

`Absence.halfDay` and `checkAbsenceConflicts({ halfDay })` shipped with the schema. `createAbsence` / `updateAbsence` hard-coded `halfDay: false`. Product (this change): vacation only, one calendar day.

## Decisions

1. **Vacation only.** Sick/reserve/other stay full-day in the API (400 if `halfDay` with another type). Schema still allows any type for system/seed rows.
2. **Single date.** `halfDay: true` requires `endDate === startDate`.
3. **Conflict hours from `TimeReport.hours`.** Window `startTime`/`endTime` is the day attendance copy, not this row’s allocation.
4. **Remainder cap 4.5h** on report save when a half vacation covers that date (`min(window, 4.5)`).
5. **KPI:** each half-vacation working day adds 0.5 to ימי חופשה. The day stays in דיווחים חסרים until 4.5 work hours are reported.
6. **UI:** half vs full vacation are two rows in סוג היעדרות (not a separate checkbox). API still stores `type: VACATION` + `halfDay`.

## Risks

Two concurrent half-vacations on the same day can both pass the overlap check — same as full-day absences; out of scope.
