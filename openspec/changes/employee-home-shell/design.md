## Context

See `proposal.md` — Why. `/` currently renders only `ReportEntryForm`. Layout is a generic Ant Design `Menu`. No GET monthly/summary endpoints exist. Figma employee home is the visual source. SCRUM-219.

## Goals / Non-Goals

**Goals:**

- One `Reports` composition: Figma header + empty KPI/list + existing form behind **דיווח ידני**
- CSS tokens and exported Figma SVGs close to the mock (header row, gradients, KPI icons) without a new CSS framework. Empty copy stays honest.
- Tests that lock empty states and the manual-report reveal

**Non-Goals:**

- New routes besides keeping `/` as home
- Backend, TanStack Query for home, mock JSON fixtures that look like October 2025 sample data

## Decisions

### D1: Compose on `/`, do not add `/dashboard`

Home is already `/` after login. A second route would split “hours” in the nav. The shell wraps the current page.

*Alternative:* `/monthly` vs `/entry` — extra nav and redirects; deferred until monthly data exists.

### D2: Month arrows update local `dayjs` month only

Arrows that no-op feel broken. Updating the Hebrew month name is honest; empty states stay empty because there is no fetch.

*Alternative:* freeze the pill on “this month” and hide arrows — less like Figma.

### D3: **דיווח ידני** is in-page state, with an explicit back control

`showEntry` (or equivalent) toggles `ReportEntryForm` in the main column; chrome stays. A Hebrew control such as **חזרה** dismisses the form. No query param required for this slice.

*Why not a modal:* the existing form is long (cascade + times); a full-width panel is closer to “today’s report screen” in the PRD.

*Why not a new URL:* one page, smaller PR; can add `?entry=1` later if refresh-while-filling matters.

### D4: Show **הפעלת שעון** disabled with **בקרוב**

Matches Figma density. `disabled` + `aria-disabled` so tests assert it does not submit. Do not wire `onClick`.

*Alternative:* hide the button — cleaner product, weaker visual match. Chosen: disabled, because this slice is explicitly a visual shell.

### D5: KPI cards use labels + **אין נתונים עדיין**, never `0` pretending to be a count

`0` sick days is a real claim. An em dash / **אין נתונים עדיין** is not. Do not show “מתוך 180” (that assumes 20×9h).

### D6: Hide the Ant Design Menu on `/`

Figma employee home has no `דיווח שעות` / `היעדרויות` / `ניהול` bar — only the abra header. **Decision:** do not render `Layout` Menu when `pathname === '/'`. Keep the Menu on `/absences` and `/admin` so those pages stay reachable.

*Alternative:* keep the Menu on home for navigation — rejected; it is not in the mock.

### D7: Month names from existing Hebrew `dayjs` locale (browser local)

`frontend/src/services/dayjs.ts` already sets `he`. The pill shows `dayjs` month names in the browser's local calendar, not a new timezone plugin. Why not Asia/Jerusalem in this slice: the repo does not pin tz today; adding `timezone` is out of scope for a visual shell.

### D8: Month arrows never change the entry form date

`ReportEntryForm` keeps its own default (today). The pill is a label for the empty monthly chrome only.

### Out of scope (edge-case N/A)

404, month lock, absences, assignment integrity, and home-fetch retry are **not** this change. Do not add lock-aware arrows, a retry spinner, or a 404 for a month. `mustChangePassword` still goes to `/change-password` via existing `RequireAuth`.

## Risks / Trade-offs

- **Users may think KPIs are broken because they are empty** → Copy **אין נתונים עדיין** on cards and list; SCRUM-216/141 replace this.
- **Disabled שעון looks like a bug** → **בקרוב** on the control; timer epic removes disabled.
- **No global nav on Figma home** → Hide Layout Menu on `/` (D6). Absences/admin still show it.

## Migration Plan

Frontend-only. Rollback is revert. No env or DB.

## Open Questions

None blocking. Wordmark: CSS text **abra** is enough; no asset in the repo.
