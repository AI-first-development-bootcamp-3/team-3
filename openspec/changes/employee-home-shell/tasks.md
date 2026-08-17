## 1. Home shell UI

- [x] 1.1 Add `frontend/src/pages/Reports.css` with Figma-like tokens (page gray, white cards, orange CTA, rounded pills). Density match, not pixel-perfect. Done: classes exist and are imported from `Reports.tsx`.
- [x] 1.2 Compose chrome in `Reports.tsx` only (do **not** remove `Layout` Menu): title **דיווח שעות**, wordmark **abra**, month pill with prev/next, orange **דיווח ידני**, disabled **הפעלת שעון** + **בקרוב**. Done: signed-in `/` shows those strings; clock is `disabled`.
- [x] 1.3 Month pill uses `dayjs` Hebrew locale; arrows change local month state only (no fetch; do not pass month into `ReportEntryForm`). Done: next/prev changes the visible month name; KPI/list empty copy is unchanged; form date still defaults to today.
- [x] 1.4 Render five KPI cards with Hebrew labels (שעות חודשיות, ימי חופשה, ימי מחלה, דיווחים חסרים, פרויקטים מדווחים) and **אין נתונים עדיין**. Done: no 142.5 / 180 / invented counts in the DOM.
- [x] 1.5 Render **פירוט יומי** with **אין דיווחים להצגה**. Done: heading visible; no day-row status pills.

## 2. Manual entry toggle

- [x] 2.1 **דיווח ידני** sets in-page `showEntry` and renders existing `ReportEntryForm`; **חזרה** clears it. Chrome stays. Done: form fields (e.g. פירוט) appear after click and disappear after back; save behavior unchanged.

## 3. Tests

- [x] 3.1 Add `frontend/src/pages/Reports.test.tsx`: home shows chrome + five empty KPI labels + daily empty; clock disabled; **דיווח ידני** then **חזרה**. Mock `/me/reporting-options` like `ReportEntryForm.test.tsx` if the form mounts. Done: `cd frontend && npm test -- src/pages/Reports.test.tsx` green; existing `ReportEntryForm` tests still pass.
