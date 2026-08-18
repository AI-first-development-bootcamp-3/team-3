## Why

The **פירוט יומי** list on `/` shows every day of the visible month — reported
days, missing days, absences, and weekends in one undifferentiated run. The
common question an employee actually has ("which days am I still missing?")
requires scanning the whole month by eye.

The home header already carries a disabled **כל הדיווחים** pill, placed there by
the Figma frame in `employee-home-shell` (archived task 4.4) and left inert
because there was no list to filter yet. There is now: `GET /reports?month&year`
ships the whole month and [`buildHomeDays()`](../../../frontend/src/pages/monthlyReportDays.ts)
collapses it into day rows with a status tone. This change makes that pill work.

## What Changes

- The **כל הדיווחים** pill becomes an enabled single-select dropdown filtering
  the day list by **day status**. Every choice is a label the product already
  shows for that kind of day — none is newly invented: `כל הדיווחים` (default),
  `חסר`, `מלא`, `חלקי`, `סופ״ש`, and one per absence type — `חופשה 🏖️`,
  `מחלה 😷`, `מילואים 🚨`, `אחר`
- The four fixed day-status labels move to a shared `DAY_STATUS_LABELS` so the
  day pills, the day panel header, and the filter cannot drift apart; the
  absence labels are likewise reused from `ABSENCE_TYPE_LABELS`. Nothing is
  restated
- Filtering is **client-side only** over the month already in memory — no new
  request, no query parameters, no backend change
- Day rows are **not recomputed**: a row either survives the filter or it does
  not. Hours, tags, and status pill stay exactly as they render today
- The five KPI cards continue to summarize the **whole month**, ignoring the
  filter
- The selected filter **survives month navigation** and resets on reload
- When a filter matches no day, the list shows an empty state distinct from the
  existing **אין דיווחים להצגה**

### Non-goals

These were considered and deliberately cut to keep the pill a single dropdown:

- **Filtering by project or client** — a day can hold up to 20 rows across
  several projects, so a project filter forces a decision about what a
  mixed day's hours and status pill mean. Not worth it for a one-axis control
- **Filtering by work location** (`מהמשרד`/`מהלקוח`/`מהבית`) — same reason;
  locations are already visible as per-day tags
- **A date range inside the month** — the month arrows already scope the list
- **A cross-employee admin reports list** — no such list, route, or endpoint
  exists. An admin filters their **own** hours on this same screen, exactly as
  an employee does
- **Server-side filtering** — deliberate. One user's month is small and already
  fully loaded; a query parameter would buy nothing and cost a backend delta

- **Renaming or re-deriving any status** — `מלא` and `חלקי` are adopted exactly
  as the day panel already uses them, including the quirk noted in design.md
  where they follow the attendance *window* rather than hours booked. Fixing
  that would change what the day pills and the panel header mean, well beyond a
  list filter

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-employee-home`: adds requirements for the day-list status filter,
  and retires the stale **Daily list is an empty state, not fake days**
  requirement, which still reads "Until the monthly list API exists" even though
  the list has been populated from `GET /reports` since SCRUM-147. It is removed
  rather than edited in place — its remaining scenario is named for the absence
  of an API that now exists — and replaced by **Daily list shows the visible
  month's days**, which preserves the same **אין דיווחים להצגה** empty state and
  the same ban on invented figures. Left standing it would contradict the new
  filter requirements

## Impact

- [`frontend/src/pages/Reports.tsx`](../../../frontend/src/pages/Reports.tsx) —
  enable the pill at lines 330-335, add filter state, apply it to `savedDays`
- [`frontend/src/pages/monthlyReportDays.ts`](../../../frontend/src/pages/monthlyReportDays.ts) and
  [`homeDemoData.ts`](../../../frontend/src/pages/homeDemoData.ts) — day rows
  gain an optional `absenceType`, since all four absence types share
  `tone: 'absence'` and the filter must not match on the display label
- New `frontend/src/lib/dayStatusLabels.ts`, with
  [`ManualReport.tsx`](../../../frontend/src/components/ManualReport.tsx) and
  `monthlyReportDays.ts` switched to it from their inline `חסר` / `מלא` /
  `חלקי` / `סופ״ש` literals. Pure substitution — no behavior change
- [`frontend/src/pages/Reports.css`](../../../frontend/src/pages/Reports.css) —
  dropdown panel styling; the pill itself is already styled
- [`frontend/src/pages/Reports.test.tsx`](../../../frontend/src/pages/Reports.test.tsx) —
  line 116 asserts the pill is **disabled** and must be replaced
- No backend, API, database, or dependency change
