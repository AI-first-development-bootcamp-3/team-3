## Purpose

Server-side work clock sessions for employees: start counting, stop into a confirmable draft, enforce business gates, and support end-of-day auto-stop without replacing manual reporting.

## ADDED Requirements

### Requirement: Start a clock session

The service SHALL let an authenticated employee start exactly one active clock session via `POST /me/clock/start`. The response SHALL include `sessionId`, `startedAt`, and `status: ACTIVE`. A second start while one session is `ACTIVE` or `AWAITING_CONFIRM` SHALL be rejected with `409`.

#### Scenario: Employee starts the clock

- **WHEN** an authenticated employee with at least one assigned task requests `POST /me/clock/start` on an unlocked month with no full-day absence on today
- **THEN** the service responds `201` with an active session whose `startedAt` is the server time

#### Scenario: Second start is blocked

- **WHEN** the employee already has an `ACTIVE` or `AWAITING_CONFIRM` session and requests `POST /me/clock/start` again
- **THEN** the service responds `409` and does not create another session

#### Scenario: No assigned tasks

- **WHEN** the employee has zero assigned active tasks
- **THEN** the service responds `409` with a Hebrew message indicating no assigned tasks

#### Scenario: Month locked

- **WHEN** the calendar month containing today is locked
- **THEN** the service responds `409` and does not create a session

#### Scenario: Full-day absence blocks start

- **WHEN** the employee has a full-day absence covering today
- **THEN** the service responds `409` and does not create a session

#### Scenario: Half-day absence allows start

- **WHEN** the employee has only a half-day absence today
- **THEN** `POST /me/clock/start` succeeds if other gates pass

### Requirement: Read current clock session

The service SHALL expose `GET /me/clock/session` returning either no session, an `ACTIVE` session, or an `AWAITING_CONFIRM` draft with computed segment times. Unauthenticated callers SHALL receive `401`.

#### Scenario: Active session after refresh

- **WHEN** an employee with an `ACTIVE` session calls `GET /me/clock/session` after reloading the app
- **THEN** the service responds `200` with the same `sessionId` and `startedAt` so the client can resume the elapsed display

#### Scenario: No session

- **WHEN** the employee has no active or awaiting session
- **THEN** the service responds `200` with `session: null`

### Requirement: Stop into awaiting confirm

The service SHALL end an `ACTIVE` session via `POST /me/clock/stop`, set `status` to `AWAITING_CONFIRM`, record `stoppedAt`, and return one or two time segments. Each segment SHALL include `date` (calendar day), `startTime`, and `endTime` in `HH:mm`. If the session crosses midnight, the service SHALL return exactly two segments split at the day boundary.

#### Scenario: Same-day stop

- **WHEN** the employee stops a session that started and ended on the same calendar date
- **THEN** the response includes one segment whose times match `startedAt` and `stoppedAt`

#### Scenario: Midnight split on stop

- **WHEN** the employee stops a session that started before midnight and ended after midnight
- **THEN** the response includes two segments: the first ending at `23:59` on the start date and the second starting at `00:00` on the next date

#### Scenario: Stop while month locked

- **WHEN** the month becomes locked before stop (edge) or stop is attempted in a locked month per product rules
- **THEN** the service responds `409` and the session remains unchanged

### Requirement: Discard awaiting confirm

The service SHALL let the employee abandon an `AWAITING_CONFIRM` session via `POST /me/clock/discard` without creating a report. After discard, `GET /me/clock/session` SHALL return no session.

#### Scenario: User cancels stop modal

- **WHEN** the employee discards while `AWAITING_CONFIRM`
- **THEN** the service responds `204` and no report row is created

### Requirement: Minimum session length on confirm path

Before the client submits report creation for a stopped session, the service SHALL reject confirm payloads derived from a session whose elapsed time is under five minutes with `400` and a Hebrew error. (Enforced when the frontend calls report create endpoints with session-derived times, or via a shared validation helper invoked by both clock discard guard and report write if times are tied to session id — implementation choice; behavior is under-five-minutes cannot become a saved report.)

#### Scenario: Under five minutes

- **WHEN** the stopped session elapsed time is less than five minutes and the client attempts to create a report from it
- **THEN** the service responds `400` and persists no report

### Requirement: End-of-day auto-stop

The service SHALL automatically stop any `ACTIVE` session at 23:59 Asia/Jerusalem, set `AWAITING_CONFIRM`, set `autoStopped: true`, and leave no report until the user confirms.

#### Scenario: Forgotten session overnight

- **WHEN** a session remains `ACTIVE` at end of calendar day
- **THEN** the job stops it into `AWAITING_CONFIRM` and the next `GET /me/clock/session` returns the draft segments

### Requirement: Logout does not stop session

Logging out SHALL NOT stop an `ACTIVE` session. The session SHALL remain resumable after re-authentication.

#### Scenario: Logout with running clock

- **WHEN** the employee logs out while the clock is active and logs in again
- **THEN** `GET /me/clock/session` still returns the active session
