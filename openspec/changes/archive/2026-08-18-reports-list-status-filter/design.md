## Context

See proposal.md — Why. What shapes the approach technically:

- [`Reports.tsx`](../../../frontend/src/pages/Reports.tsx) fetches one month in
  `fetchMonth()` and fans the result into four pieces of state: `monthReports`,
  `monthAbsences`, `monthKpis`, and `savedDays`. Three consumers read that
  fetch — the KPI cards, the day list, and `openManualReport()`, which slices
  `monthReports` by date to seed the panel.
- Day rows carry a `tone` from
  [`buildHomeDays()`](../../../frontend/src/pages/monthlyReportDays.ts):
  `missing`, `full`, `partial`, `weekend`, `absence`.
- The same day is labelled in **two** places, and they disagree on purpose. The
  row pill shows `חסר`, `סופ״ש`, an absence-type label, or a *computed* hours
  string (`9 שעות`). Open that day and
  [`deriveHeader()`](../../../frontend/src/components/ManualReport.tsx) labels
  the panel from the same tones, but gives `full` and `partial` the fixed words
  `מלא` and `חלקי`. So every tone does have shipped wording — just not all of it
  on the row.
- The pill exists and is styled — a bordered white pill with a chevron, placed
  by the Figma frame. Only its `disabled` attribute and a menu are missing.

## Goals / Non-Goals

**Goals:**

- Add the filter without touching the fetch, the KPI computation, or the
  manual-report panel's data
- Keep `buildHomeDays()` a pure month→rows function, unaware of filtering

**Non-Goals:**

- Changing how any tone is derived. The filter inherits `buildHomeDays()`'s
  existing classification verbatim, quirks included (see Risks)
- Generalizing the control for reuse by a future admin list

## Decisions

### Filter at render, not at fetch or build

The filter is applied where `savedDays` is read for rendering, leaving
`savedDays` itself the full month.

Alternatives rejected:

- **Filter inside `fetchMonth()`** — would silently change the KPI cards, which
  the spec requires to stay whole-month, and would force a refetch on every
  filter change for no benefit.
- **Filter inside `buildHomeDays()`** — turns a pure, unit-tested month→rows
  function into one that needs a filter argument, and its output also feeds
  nothing else today but would become the wrong shape the moment it does.
- **Filter in a `useMemo` over `savedDays`** — fine, and the likely mechanical
  form. The point of this decision is only that the *source* state stays
  unfiltered; whether the derived list is memoized is an implementation detail.

This is what keeps the spec's "opening a day still works while filtered"
scenario true for free: `openManualReport()` reads `monthReports`, which the
filter never touches.

### Filter state is component state in `Reports.tsx`

A plain `useState` alongside `month`. The component does not unmount when the
month changes, so an active filter survives month navigation with no extra work,
and a reload starts clean — exactly the persistence the spec asks for.

Alternatives rejected: a URL search param or `sessionStorage` would both survive
reload, which the spec explicitly does not want, and would add a decision about
which one for no gain.

### The menu offers only labels the product already shows

Rather than name the statuses freshly, every choice is a string already rendered
for that kind of day. That decides the menu by itself — `כל הדיווחים`, `חסר`,
`מלא`, `חלקי`, `סופ״ש`, and the four absence-type labels — and it means the menu
draws from both surfaces: the row pills for `חסר`/`סופ״ש`/absences, and the day
panel header for `מלא`/`חלקי`.

The consequence is worth stating plainly: filtering by `מלא` lists a row whose
own pill reads `9 שעות`. The filter and the row describe the same day in the two
vocabularies the product already uses. Renaming either to match is a change to
shipped copy on both surfaces, not a filter concern.

Alternative rejected: dropping `full`/`partial` because the *row* has no fixed
label for them. That reading would have made reported days unfilterable — the
most likely thing anyone wants from this control — on a technicality about which
surface the label appears on.

### One source per label

`חסר`, `מלא`, `חלקי`, and `סופ״ש` were inline literals in two files; the filter
would have made it three. They move to a shared `DAY_STATUS_LABELS` that
`deriveHeader()`, `buildHomeDays()`, and the filter all read, so the pill, the
panel header, and the menu cannot drift apart. Absence labels already had such a
source in `ABSENCE_TYPE_LABELS` and are reused the same way.

### Matching absence rows on type, not on `tone` or the label

All four absence types share `tone: 'absence'`, so tone alone cannot separate
them, and matching on `status` would couple the filter to display copy — the
exact coupling the rule above is meant to avoid. `DemoDay` therefore gains an
optional `absenceType`, set by `absenceDay()`, and the filter matches on it.

Filter values are `'all' | 'missing' | 'weekend' | AbsenceType`. The two unions
do not overlap, so no discriminator or prefixing is needed.

### Custom listbox, not a native `<select>`

A native `<select>` cannot carry the pill's border, chevron asset, and RTL
alignment without fighting the existing CSS. The control should be a `button`
with `aria-haspopup="listbox"` / `aria-expanded` opening a `role="listbox"` of
`role="option"` items, closing on selection, `Escape`, and outside click.

Trade-off acknowledged: a native `<select>` would give keyboard and screen-reader
behavior for free. Since the pill's appearance is Figma-specified and already
built, matching it is worth owning the ARIA — but the keyboard path (arrow keys,
`Enter`, `Escape`, focus return to the pill) has to be built deliberately, not
left to a click handler.

### Replacing the disabled-pill assertion is a behavior change, not a weakened test

[`Reports.test.tsx:116`](../../../frontend/src/pages/Reports.test.tsx#L116)
asserts the pill is disabled. That assertion is now wrong by design and gets
replaced with coverage of the enabled control. Calling this out because the
team's rule is to fix the code rather than the test — this is the exception the
rule allows for, and it should not be used as cover for adjusting any other
assertion in that file.

## Risks / Trade-offs

- **`מלא` / `חלקי` may not mean what users expect** → the tones follow the
  attendance *window*, not hours actually allocated: a day with a 9-hour window
  but only 4 booked hours classifies as `missing`, not `partial`. So `חלקי`
  returns days with a short *window*, not days that are partly filled.
  Mitigation: none, deliberately. This is shipped classification that the day
  panel header already presents under these exact words; the filter inherits it
  rather than inventing a second meaning. If it misleads people, the fix is the
  tone derivation in `buildHomeDays()`/`deriveHeader()`, which changes both
  existing surfaces and is its own change.
- **The filter and the row speak differently about the same day** → filtering by
  `מלא` lists a row whose pill reads `9 שעות`. Mitigation: none needed for
  correctness, but it is the most likely thing a reviewer flags. Both strings
  are shipped copy; reconciling them is a copy decision across the row pill and
  the panel header.
- **The stale main-spec requirement** → this change edits
  `frontend-employee-home`'s "Daily list is an empty state" requirement, which
  describes a state the product left behind at SCRUM-147. If another in-flight
  change is also rewriting that requirement, the two deltas will collide at
  archive time. Mitigation: none of the 13 open changes currently touches
  `frontend-employee-home`; re-check before archiving.
- **Filter hides the day the user just saved** → saving from the panel calls
  `refreshSavedDays()`, and the saved day may no longer match the active filter,
  so it vanishes on save. Mitigation: accepted as correct behavior; the filter
  is doing its job. Worth watching in review if it reads as a bug.
