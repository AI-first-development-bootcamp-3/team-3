## 1. Data model & assignment filter

- [x] 1.1 Add Prisma `WorkClockSession` model and migration
- [x] 1.2 Add or verify User↔Task assignment model and seed data for local dev
- [x] 1.3 Filter `GET /me/reporting-options` to assigned tasks only; update tests

## 2. Backend clock API

- [x] 2.1 Implement `GET /me/clock/session`, `POST /me/clock/start`, `POST /me/clock/stop`, `POST /me/clock/discard`
- [x] 2.2 Enforce gates: month lock, full-day absence, no assignments, single active session
- [x] 2.3 Compute same-day and midnight-split segments on stop
- [x] 2.4 Enforce minimum 5-minute duration before report create from session times
- [x] 2.5 Integration tests for start/stop/discard/resume and error cases

## 3. EOD auto-stop

- [x] 3.1 Scheduled job at 23:59 Asia/Jerusalem to stop active sessions into `AWAITING_CONFIRM`
- [x] 3.2 Test simulating auto-stop and subsequent session read

## 4. Frontend home clock

- [x] 4.1 API client hooks for clock session CRUD
- [x] 4.2 Replace disabled **הפעלת שעון** with idle/running states (HH:MM:SS + **עצור שעון**)
- [x] 4.3 Refetch session on mount and window focus; sync multi-tab via server state
- [x] 4.4 Stop modal with stepped project/task/location sheets and optional description
- [x] 4.5 Confirm via `POST /reports` or `POST /reports/batch`; discard via `/me/clock/discard`
- [x] 4.6 Open confirm modal when `AWAITING_CONFIRM` (including after auto-stop)
- [x] 4.7 Frontend tests for idle → active → stop → confirm/cancel flows

## 5. Docs & Jira

- [x] 5.1 Swagger entries for `/me/clock/*` routes
- [x] 5.2 Link OpenSpec change and SCRUM-305 in PR description
