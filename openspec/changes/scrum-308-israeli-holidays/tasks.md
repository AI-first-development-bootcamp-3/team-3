## 1. Calendar (backend)

- [x] 1.1 Add `@hebcal/core` and a pure `listIsraeliHolidaysForYear(year)` that returns the in-scope codes + Gregorian dates; tests pin 2026 (and Independence Day postponement if 2026 observes it)
- [x] 1.2 Prisma: `AbsenceType.HOLIDAY` + `IsraeliHoliday` table (`year`, `date`, `code`, `nameHe`); migrate
- [x] 1.3 `syncIsraeliHolidays(year)` upserts the table; idempotent test

## 2. Materialize absences (backend)

- [x] 2.1 `ensureHolidayAbsencesForMonth({ year, month })` creates `HOLIDAY` rows for active users on Sun–Thu holidays; skips Fri/Sat; skips locked months; tests
- [x] 2.2 Replace occupancy: delete time reports on that date; split other absences; tests for hours + overlapping vacation
- [x] 2.3 Call ensure from month list paths (`GET` reports/absences for a month) so opening the home month creates rows
- [x] 2.4 `POST /absences` rejects `HOLIDAY`; `DELETE` of `HOLIDAY` rejected; tests 400/403

## 3. API + frontend

- [x] 3.1 `GET /holidays?year=` authenticated; 400 on bad year; Swagger
- [x] 3.2 Frontend: `HOLIDAY` type, Hebrew **חג** chip, omit from absence form dropdown; KPI test that חג ≠ חופשה
- [x] 3.3 Month grid still treats חג as covered (not missing); test

## Done when

- Opening an unlocked month that contains a weekday Israeli public holiday shows חג for the current user without using vacation
- `GET /holidays?year=2026` lists Hebrew names with correct civil dates
- CI: targeted backend + frontend tests green
