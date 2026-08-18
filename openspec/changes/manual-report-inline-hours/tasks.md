## 1. Window math and schema

- [x] 1.1 Add a shared `attendanceWindowHours(start, end)` helper (overnight and equal-times = 24h) with unit tests for 09:00–18:00, 22:00–06:00, and 09:00–09:00
- [x] 1.2 Prisma: add `hours` on `TimeReport`, migrate existing rows (per user+date window + converted hours), then require `hours`
- [x] 1.3 Zod: day window + per-row `hours` (multiple of 0.5, min 0.5) on `POST /reports` and `POST /reports/batch`; drop per-row end≥start refine; add sum ≤ window refine

## 2. API

- [x] 2.1 Persist `hours` and copy request window onto each row; list responses expose `hours` (keep `durationHours` as the same number if already used)
- [x] 2.2 Tests: overnight 201, hours 0 / 1.33 → 400, sum over window → 400 `HOURS_EXCEED_WINDOW`, 4+3 under 9h → 201
- [x] 2.3 Update Swagger JSDoc for both write routes

## 3. Frontend form

- [x] 3.1 Schema/types: day `startTime`/`endTime`, row `hours` default 0; remove row clocks
- [x] 3.2 Replace `ManualReportPicker` sheets with inline dropdowns (project from reporting-options, task filtered, location enum); auto-select sole task
- [x] 3.3 Hours stepper 0–24 step 0.5; הוספת פרויקט inserts an empty card at 0
- [x] 3.4 Save: keep button enabled; banner for empty fields, hours 0, and sum > window; batch payload matches new API
- [x] 3.5 Update ManualReport / Reports tests (no stepper; overnight window; two-row under-window save)

## 4. Cleanup

- [x] 4.1 Remove unused picker assets/CSS if nothing else references them
- [x] 4.2 README note: batch body shape and overnight window
