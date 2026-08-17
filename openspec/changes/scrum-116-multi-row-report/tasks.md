One PR into `development`. Tests ship with the code, not after it.

## 1. Backend — SCRUM-128

- [x] 1.1 `createTimeReportBatchBodySchema`: shared `date`, `rows` (1–20), row `description` optional, `endTime >= startTime` per row
- [x] 1.2 `createTimeReportBatch` service — validate every row, then one `prisma.$transaction`; errors as `rows.<index>.<field>`
- [x] 1.3 `POST /reports/batch` route + controller + `@openapi`
- [x] 1.4 Route tests: 201 with two rows, 401, 400 empty rows, 400 hierarchy mismatch rolls back, 400 end before start, optional description

## 2. Manual report screen — SCRUM-129

- [x] 2.1 `ManualReport.css` with the Figma tokens (background, card, cell, separator, segmented, footer)
- [x] 2.2 Screen chrome: close button, title, segmented control, day label + `תקן יומי 9 שע׳` tag, `כניסה`/`יציאה` card
- [x] 2.3 Project cards from `useFieldArray`, `הוספת פרויקט`, `מחיקת פרויקט` + confirmation dialog
- [x] 2.4 Sticky footer: reported-versus-9h progress and `שמירה`
- [x] 2.5 Zod schema for the day, per-card errors, day-window check

## 3. Stepped sheets — SCRUM-221

- [x] 3.1 `PickerSheet` — title, back action, grouped options, selected row with check, CTA disabled until chosen
- [x] 3.2 Wire `בחר פרויקט` → `בחר משימה` → `בחר מיקום` onto the card cells

## 4. Wiring — SCRUM-129

- [x] 4.1 `createReportBatch()` in `services/reports.ts` and batch types
- [x] 4.2 Render from `pages/Reports.tsx`; retire `ReportEntryForm`
- [x] 4.3 Map `rows.<index>.<field>` details onto the right card

## 5. Tests — SCRUM-130

- [x] 5.1 Screen tests: add two cards and save sends one batch; delete asks and removes one card; incomplete card blocks the save
- [x] 5.2 Schema unit tests for the day rules
- [x] 5.3 Backend + frontend `npm test` and `npm run lint` green

## 6. Verify

- [x] 6.1 Compare the running screen against Figma `1:1621` and `1:4352` and close the gaps
- [x] 6.2 Headless-Chrome capture of every state measured against the frame geometry (header, segmented, cards, pills, footer, sheets, alert)
