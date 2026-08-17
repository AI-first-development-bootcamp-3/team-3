## 1. Home shell UI

- [x] 1.1 Add `frontend/src/pages/Reports.css` with Figma-like tokens (page gray, white cards, orange CTA, rounded pills). Density match, not pixel-perfect. Done: classes exist and are imported from `Reports.tsx`.
- [x] 1.2 Compose chrome in `Reports.tsx` only: title **דיווח שעות**, wordmark **abra**, month pill with prev/next, orange **דיווח ידני**, disabled **הפעלת שעון** + **בקרוב**. Hide Layout Menu on `/`. Done: signed-in `/` shows those strings; clock is `disabled`.
- [x] 1.3 Month pill uses `dayjs` Hebrew locale; arrows change local month state only (no fetch; do not pass month into `ReportEntryForm`). Done: next/prev changes the visible month name; KPI/list empty copy is unchanged; form date still defaults to today.
- [x] 1.4 Render five KPI cards with Hebrew labels (שעות חודשיות, ימי חופשה, ימי מחלה, דיווחים חסרים, פרויקטים מדווחים) and **אין נתונים עדיין**. Done: no 142.5 / 180 / invented counts in the DOM.
- [x] 1.5 Render **פירוט יומי** with **אין דיווחים להצגה**. Done: heading visible; no day-row status pills.

## 2. Manual entry toggle

- [x] 2.1 **דיווח ידני** sets in-page `showEntry` and renders existing `ReportEntryForm`; **חזרה** clears it. Chrome stays. Done: form fields (e.g. פירוט) appear after click and disappear after back; save behavior unchanged.

## 3. Tests

- [x] 3.1 Add `frontend/src/pages/Reports.test.tsx`: home shows chrome + five empty KPI labels + daily empty; clock disabled; **דיווח ידני** then **חזרה**. Mock `/me/reporting-options` like `ReportEntryForm.test.tsx` if the form mounts. Done: `cd frontend && npm test -- src/pages/Reports.test.tsx` green; existing `ReportEntryForm` tests still pass.

## 4. Figma visual fidelity (empty shell)

- [x] 4.1 Commit exported Figma SVGs under `frontend/src/assets/home/` (logo, arrows, CTA icons, five KPI icons). Do not hand-draw paths.
- [x] 4.2 Restyle `Reports` header as one Figma row (logo + title, month pill with inner arrows, gradient CTAs). Hide Layout Menu on `/`. Empty KPI/list copy unchanged.
- [x] 4.3 Tests still lock empty states; abra is the logo `img` alt; month pill is `MMMM` only.
- [x] 4.4 Match Figma placement details: `abra` right of a 1px/32px `#ECECEC` divider then the title; **דיווח ידני** left of **הפעלת שעון**; icon pill on each button's trailing edge; `‹` left and `›` right in the month pill; KPI icon on the card's left with the label on the right; **כל הדיווחים** as a bordered white pill with a chevron. Done: header/actions/card sides match the Figma node screenshots.
- [x] 4.5 Drop the visible **בקרוב** badge (not in Figma); keep the clock disabled, dimmed, with **בקרוב** as accessible text + `title`. Done: `toHaveAccessibleName(/בקרוב/)` and no visible badge.
- [x] 4.6 Use Figma geometry for the body: 1116px centered content, 32px section rhythm, 20px KPI gap, 0 4px 8px CTA shadows and the exported gradient angles. Done: desktop matches the frame at 1920.

## 5. Dev-only Figma preview

- [x] 5.1 Add `frontend/src/pages/homeDemoData.ts` fixtures plus row/tag SVGs, rendered only when `import.meta.env.DEV` and `?demo=1`. Done: `/?demo=1` shows the Figma rows; `/` still shows empty states and the production bundle cannot reach the fixtures.
- [x] 5.2 Test locks the flag: no tags without it, KPI figures and all four tag tones with it. Done: `Reports.test.tsx` covers both.
