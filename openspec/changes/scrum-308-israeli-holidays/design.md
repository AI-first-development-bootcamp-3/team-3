## Context

Working days are Sunday–Thursday (`expandWorkingDays`). Absences already cover a day so it is not a missing report; vacation KPI counts only `VACATION`. There is no holiday type and `holidayCalendar` on `expandWorkingDays` is unused.

Product decisions (student, 2026-08-19): paid official public holidays only; every active user including admins; existing hours/absences on that date are replaced.

## Goals / Non-Goals

**Goals**

- Deterministic Gregorian dates for in-scope Israeli holidays for any year
- Visible one-day חג row on Sunday–Thursday holidays for each active user
- Paid day off: not vacation, not a missing report

**Non-goals**

- ערב חג / חול המועד / memorial days
- Half-day holidays
- Letting employees opt out or work “overtime on a holiday” in v1
- Treating holidays as weekends inside `expandWorkingDays` (the row is the coverage; vacation ranges are split around the day)

## Decisions

1. **Library `@hebcal/core` with `il: true`, not a live HTTP calendar.** Why: no network, no API key, Hebrew→Gregorian and Independence Day postponement are the library’s job. Alternative: hebcal.com HTTP — fails offline/CI and needs caching anyway.

2. **Fixed in-scope set (Hebrew names in UI, English ids in code):**
   - `rosh_hashana_1`, `rosh_hashana_2`
   - `yom_kippur`
   - `sukkot`
   - `simchat_torah` (Shemini Atzeret / Simchat Torah in Israel)
   - `pesach`
   - `pesach_7`
   - `shavuot`
   - `yom_haatzmaut`
   Why: matches “official paid public holidays” and excludes eves/chol hamoed/memorial days.

3. **Persist resolved rows `IsraeliHoliday { year, date, code, nameHe }` unique on `(year, date)`.** Why: month load and tests can read DB; regeneration for a year is idempotent. Alternative: compute only in memory — harder to inspect and to freeze a year in tests.

4. **Materialize lazily when loading a user’s month (reports/absences) and when an admin lists another user’s month.** Why: no cron in this stack; opening the month is when the row must exist. Also run for the current+next Gregorian year at process start (best-effort) so dates exist before anyone opens August.

5. **`AbsenceType.HOLIDAY`, one row per user per holiday date (`startDate = endDate`).** Why: reuses absence conflict/KPI “covered day” behavior. Alternative: a separate `HolidayObservance` table — more joins for the month grid.

6. **Replace policy:** delete that user’s time reports on the date; if another absence overlaps the date, shrink/split it so the holiday day is only `HOLIDAY`. Why: student chose replace. Locked month: skip the whole date for everyone.

7. **Employees/admins cannot POST/PATCH/DELETE `HOLIDAY`.** System service uses a trusted internal path (not the public create schema). Why: the calendar owns the row.

8. **Do not apply `holidayCalendar` inside `expandWorkingDays` in this change.** Why: a חג Thursday is still a “working weekday” that is *covered*. Weekend holidays simply create no absence. Alternative: exclude holidays from working-day lists — then there would be no row to show, which contradicts “auto added row”.

## Holiday set vs Gregorian year

Resolution uses the **Gregorian year of the civil date** (the date employees see). A Hebrew holiday near 1 January may belong to the previous Hebrew year; `@hebcal/core` is queried for the Gregorian year (and Dec/Jan boundary as the library requires) so each `YYYY-MM-DD` is unique.

Tests MUST pin at least one known mapping, e.g. document 2026 dates from Hebcal Israel and assert the service returns them.

## Risks / Trade-offs

- **Hebcal major-holiday names** can differ (`Sukkot I` vs `Sukkot`). Map by flag/type, not by English string equality alone; snapshot tests on codes.
- **Replace is destructive** for hours already entered on a holiday. Document in UI copy that the day became חג. No undo in v1.
- **Lazy materialization** can make the first month GET slower; bound work to holidays in that month × active users is small.

## Migration Plan

Prisma enum value `HOLIDAY` + `israeli_holidays` table. Backfill years 2025–2027 in migration or on first boot. Existing production data: next month fetch creates rows.

## Open Questions

None blocking. Later: overtime on a holiday, ערב חג half-days.
