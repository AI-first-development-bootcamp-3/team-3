## Why

SCRUM-114 gave us one report per save. A real day is rarely one project: the Figma **דיווח ידני** flow lets an employee clock in once and then add several project cards under **דיווח פרויקטים**, each with its own task, location, hours, and detail. SCRUM-116 (epic SCRUM-6) turns the single form into that screen, and it unblocks hours-remaining (SCRUM-117) and edit (SCRUM-118).

## What Changes

- `POST /reports/batch` (JWT required) creates every row of one day in a single transaction — all rows persist or none do
- Per-row `400` details (`rows.0.taskId`) so the UI can point at the card that is wrong
- Rebuild `/` manual reporting as the Figma screen: segmented picker (`דיווח עבודה` / `דיווח היעדרות`), day header with `תקן יומי 9 שע׳`, clock-in/out card, a list of project cards, `הוספת פרויקט`, `מחיקת פרויקט` with confirmation, and the sticky footer with the day's progress and `שמירה`
- Stepped selection sheets: `בחר פרויקט` → `בחר משימה` → `בחר מיקום`, matching the mock instead of plain dropdowns
- Retire `ReportEntryForm` in favour of the multi-row screen

### Non-goals

- Persisting the day's `כניסה` / `יציאה` as an attendance record — no model exists for it (see design)
- `דיווח היעדרות` behind the second segment (SCRUM-136+), the segment renders but is not wired
- Assignment filtering (SCRUM-71), edit of saved days (SCRUM-118), month lock, timer

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `time-reports`: batch create for a day, and the entry screen becomes multi-row

## Impact

- Backend: `timeReport.schema.ts`, `timeReport.service.ts`, controller, route + Swagger, route tests
- Frontend: new `ManualReport` screen and sheets replacing `ReportEntryForm`, `services/reports.ts`, types
- Jira: SCRUM-116 with subtasks SCRUM-128 (backend), SCRUM-129 (UI), SCRUM-130 (tests), SCRUM-221 (stepped sheets)
