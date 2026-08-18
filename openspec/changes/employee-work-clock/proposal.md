## Why

The employee home already shows **הפעלת שעון** as a disabled **בקרוב** placeholder (`frontend-employee-home`). The PRD describes a separate fast path: start counting at the beginning of the work period, stop at the end, then capture project details and save a report. Employees who work in real time should not have to re-type start/end times manually. Jira: [SCRUM-305](https://dangutman98-1786525083697.atlassian.net/browse/SCRUM-305) under epic SCRUM-226 (דיווח שעות - עובד).

## What Changes

- Enable a **server-backed work clock**: start, live elapsed display, stop, confirm draft via modal
- Stop modal collects location + assigned client/project/task (description optional); confirm creates real report row(s) via existing report APIs
- Home **הפעלת שעון** becomes a working control (replaces disabled **בקרוב** state while idle; shows **עצור שעון** + HH:MM:SS while running)
- **דיווח ידני** remains a separate full-control path; same day may mix clock rows and manual batch rows
- Filter `GET /me/reporting-options` to **assigned tasks only** (ship together with this change)
- End-of-day auto-stop at 23:59 with draft awaiting confirm on next visit
- Midnight-crossing sessions split into two calendar-day rows in one confirm action
- Full-stack v1 (backend session API + frontend UI + tests); no admin timer dashboard in v1

### Non-goals

- Pause/resume within a session
- `CLOCK` vs `MANUAL` source metadata on reports
- Admin force-stop or “who is clocked in” view
- Auto-select when only one assignment exists
- Changing manual batch form behavior beyond shared reporting-options filter

## Capabilities

### New Capabilities

- `backend-work-clock`: Server session lifecycle (start/stop, active lookup, EOD auto-stop, validation gates)
- `frontend-work-clock`: Home timer UX, stop modal with stepped pickers, confirm/discard draft flow

### Modified Capabilities

- `frontend-employee-home`: Replace “clock is not a working timer” with enabled clock CTA behavior (delegates timer logic to `frontend-work-clock`)
- `time-reports`: Reporting options limited to assigned tasks; clock confirm uses `POST /reports` / `POST /reports/batch` for split segments

## Impact

- Backend: new Prisma model + routes under `/me/clock/*`, scheduled EOD job, assignment filter on reporting options, tests
- Frontend: home clock state, modal + stepped sheets reuse, API client hooks, tests
- Existing `POST /reports` and `POST /reports/batch` reused for persistence after confirm
- Supersedes SCRUM-71 dependency for assigned-only picker within this delivery
- Jira: SCRUM-305
