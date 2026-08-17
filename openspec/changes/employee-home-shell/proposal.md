## Why

`/` is the daily entry form (SCRUM-114). The Figma employee home is a monthly chrome around that form: header, month, **דיווח ידני**, KPI row, daily list. Employees cannot yet see that layout, and live KPIs/list APIs are not built (SCRUM-216, SCRUM-140). This slice ships the visual shell with honest empty states so home matches Figma without fake numbers. Jira: [SCRUM-219](https://dangutman98-1786525083697.atlassian.net/browse/SCRUM-219) under epic SCRUM-6.

## What Changes

- Authenticated `/` becomes the Figma home shell (Hebrew RTL): abra + **דיווח שעות**, month pill (current month, prev/next UI only), orange **דיווח ידני**
- **דיווח ידני** reveals the existing `ReportEntryForm` (same save/reset as today)
- **הפעלת שעון** is not a working timer (hidden or disabled; later epic)
- Five KPI cards and **פירוט יומי** render as empty states — no hardcoded hours, absences, or day rows
- No new backend endpoints

### Non-goals

- Live KPI calculation (SCRUM-216)
- Monthly report GET / day-status (SCRUM-140 / 137)
- Click-to-edit list (SCRUM-141 / 118)
- Timer (later epic)
- Changing login, auth, or POST `/reports`

## Capabilities

### New Capabilities

- `frontend-employee-home`: Layout and empty states of the employee hours home screen (header, month, manual-report CTA, KPI placeholders, daily-list empty)

### Modified Capabilities

- (none — `frontend-styling` RTL/mobile-first is reused, not changed)

## Impact

- Frontend only: `Reports` page, Layout header on `/`, CSS, tests
- Existing `ReportEntryForm` stays the manual-entry surface
- Jira: SCRUM-219
