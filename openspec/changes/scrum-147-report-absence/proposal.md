## Why

The **דיווח העדרות** tab in the daily drawer is disabled. Employees can report hours but cannot record חופשה / מחלה / מילואים / אחר, even though the `Absence` table, working-day helper, and conflict checker already exist. SCRUM-147 (subtasks 162–164) is the first user-facing slice of epic היעדרויות.

## What Changes

- Add authenticated `POST /absences` (type, start date, optional end date). Persist one `Absence` row (`halfDay` false). Run conflict check before insert. Compute working-day count with `expandWorkingDays` (Fri–Sat excluded).
- Enable the **דיווח העדרות** tab in the existing דיווח ידני drawer: type, from–to dates, live working-day count, Hebrew conflict errors, save.
- Out of scope: attachments (SCRUM-148), half-day (SCRUM-149), edit/cancel (SCRUM-150), month lock (SCRUM-146).

## Capabilities

### New Capabilities

- `absences-reporting`: Create a full-day absence via API and the Hebrew RTL form in the daily drawer.

### Modified Capabilities

_(none — conflict rules and working-day math stay as specified; this change only calls them.)_

## Impact

- **Backend:** new route/controller/service/Zod schema; reuse `checkAbsenceConflicts` and `expandWorkingDays`; Swagger + README.
- **Frontend:** `ManualReport` tab; new form component; `POST /absences` client; working-day count helper with tests.
- **Not touched:** Prisma schema, attachment upload, month lock.
