## Context

See proposal.md for why. Today each `TimeReport` row has its own `startTime`/`endTime`, `POST /reports/batch` repeats those per row, and the UI collects project/task/location through `ManualReportPicker` sheets. `GET /me/reporting-options` already returns the caller's assigned client → project → task tree. Zod currently rejects `endTime < startTime`, which forbids overnight attendance.

## Goals / Non-Goals

**Goals:**

- One attendance window per request; per-row `hours` in 0.5 steps; overnight window math; inline dropdowns; keep batch atomicity and assignment checks.

**Non-Goals:**

- Modeling lunch as its own row or absence type.
- Changing month-lock (still out of band if not already on these routes).
- A separate client dropdown.
- Timer / שעון.
- Absences tab.

## Decisions

1. **Copy the day window onto every row** instead of a new `TimeReportDay` table. Why: one migration on `time_reports`, list/GET stay row-shaped. Alternative: parent day entity — cleaner model, extra table and joins for this slice.

2. **Add `hours` as `Decimal(4,1)`** (or equivalent) on `TimeReport`. Why: 0.5 steps without float noise. Alternative: store minutes as int — also fine; pick decimal to match the UI number.

3. **Overnight: `end <= start` means next day**, including equal times = 24h. Why: matches the product answer; avoids a boolean `nextDay`. Alternative: reject equal times as empty — worse for a 24h shift.

4. **Validate sum(hours) ≤ windowHours** in Zod refine + service (service has the overnight helper so tests can share it). Window overflow is `400` with a stable code e.g. `HOURS_EXCEED_WINDOW`.

5. **`POST /reports` (single) uses the same fields** as one batch row plus the window, so Swagger and the single-row tests stay one contract. The דיווח ידני screen still only calls batch.

6. **Dropdowns:** flatten reporting-options to project list (label may include client name if two projects share a name). Tasks filter by selected `projectId`. Location stays the existing enum. Auto-select task when `tasks.length === 1`.

7. **Hours control:** numeric stepper 0–24, step 0.5, default 0; save-time min 0.5 (client and server).

8. **Do not disable שמירה.** Client-side banner copy (existing missing-details pattern) for empty dropdowns, hours 0, and sum > window.

9. **Migration of old rows:** for each `(userId, date)` group, set every row's `startTime`/`endTime` to that group's min start and max end (if all rows already same-day end≥start; if any overnight-looking pair exists, keep the widest overnight interpretation) and set `hours` from the old per-row interval using the same window helper. If that would make sum(hours) > new window, cap is not applied historically — leave stored hours as converted intervals (data may predate the new rule). Document in README.

## Risks / Trade-offs

- **[Risk]** Old per-row clocks encoded project-specific times; collapsing to one window loses that. → Accept; product no longer wants per-project clocks.
- **[Risk]** Equal start/end as 24h surprises someone who left both at 09:00 by accident. → UI still shows 24h in the footer; they can change times.
- **[Risk]** `Decimal` vs JS number. → Parse with a half-hour check (`hours * 2` is integer) in Zod.

## Migration Plan

1. Add `hours` nullable, backfill, then NOT NULL.
2. Deploy API that accepts both? **No** — one breaking deploy; frontend ships in the same PR.
3. Rollback: restore previous schema only if no new rows rely on `hours`; otherwise forward-fix.

## Open Questions

None that block the spec. Client-name in the project label is a display detail: show `שם לקוח · שם פרויקט` when more than one client exists in options.
