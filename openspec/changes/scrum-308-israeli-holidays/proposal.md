## Why

Israeli public holidays still look like missing work: employees must remember to log an absence, and if they pick חופשה it burns vacation. SCRUM-144 already reserved a holiday-calendar hook and left the calendar itself for later. We now need Gregorian dates that follow the Hebrew calendar **this year**, and an automatic paid **חג** row so the day is covered without using vacation.

## What Changes

- Resolve official Israeli paid public holidays to exact `YYYY-MM-DD` for any Gregorian year (Hebrew calendar + Yom HaAtzmaut postponement)
- Add absence type `HOLIDAY` (UI: חג) that is system-owned, not selectable in the employee absence form
- On each Sunday–Thursday holiday, auto-create a one-day `HOLIDAY` absence for every **active** user (employees and admins)
- Skip Friday/Saturday holidays (already non-working)
- Skip locked months (no rewrite)
- If the user already has time reports or another absence on that date, **replace** with the חג row (split multi-day absences around the day)
- `HOLIDAY` days do not increment ימי חופשה; they do count as covered (not missing reports)

Out of v1: ערב חג, חול המועד, Yom HaShoah, Yom HaZikaron, Purim, Hanukkah.

## Capabilities

### New Capabilities

- `backend/israeli-holidays`: holiday list for a Gregorian year, persistence of resolved dates, and materializing/replacing per-user חג absences

### Modified Capabilities

- `backend/absences-data-layer`: `AbsenceType` gains `HOLIDAY`; employees cannot create/update/delete that type
- `backend/absence-conflict-validation`: system holiday materialization is allowed to replace overlapping reports/absences on the holiday date
- `frontend-employee-home`: month grid shows חג; KPI ימי חופשה ignores `HOLIDAY`

## Impact

- Prisma `AbsenceType` enum + optional `IsraeliHoliday` (or equivalent) table for resolved Gregorian dates
- Backend: `@hebcal/core` (offline Hebrew calendar; why: no live API or secrets, dates are deterministic)
- `GET /holidays?year=` (auth) for the resolved list; materialization runs when a month of reports/absences is loaded (and for new active users)
- Frontend absence badge/copy **חג**; type omitted from the create-absence dropdown
- Tests: known-year mapping (e.g. 2026), weekend skip, replace conflict, locked month, vacation KPI
