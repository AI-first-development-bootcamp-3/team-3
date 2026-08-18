## Purpose

Employee-facing work clock on the hours home: live timer, stop modal with stepped hierarchy/location pickers, and confirm/discard that creates normal time reports.

## ADDED Requirements

### Requirement: Home clock CTA while idle

When no clock session is active or awaiting confirm, the home SHALL show an enabled **הפעלת שעון** control. Activating it SHALL call `POST /me/clock/start` and SHALL NOT open the manual report form.

#### Scenario: Employee starts from home

- **WHEN** the employee taps **הפעלת שעון** with no active session
- **THEN** the UI switches to the running-clock state without navigating away from home

### Requirement: Running clock replaces start CTA

While a session is `ACTIVE`, the home SHALL hide **הפעלת שעון**, show elapsed time as live **HH:MM:SS** derived from server `startedAt`, and show **עצור שעון**. **דיווח ידני** SHALL remain available.

#### Scenario: Elapsed display updates

- **WHEN** a session is active
- **THEN** the displayed elapsed time increases every second without requiring a full page reload

### Requirement: Stop opens confirm modal

Activating **עצור שעון** SHALL call `POST /me/clock/stop` and open a centered Hebrew RTL modal. The modal SHALL collect project, task, and location through the same stepped sheets used by manual reporting (`בחר פרויקט` → `בחר משימה` → `בחר מיקום`). Description SHALL be optional. The user SHALL always pick hierarchy manually (no auto-select when only one assignment).

#### Scenario: Stop shows stepped pickers

- **WHEN** the employee stops the clock
- **THEN** the modal walks project → task → location before enabling confirm

### Requirement: Confirm creates report rows

Confirming the modal SHALL create report row(s) using existing APIs: `POST /reports` for one segment or `POST /reports/batch` for two segments after a midnight split. Required fields SHALL be location and hierarchy. On success the UI SHALL clear the clock session, show success feedback, and SHALL NOT leave a draft open.

#### Scenario: Same-day confirm

- **WHEN** the employee confirms with valid hierarchy and location for a single segment
- **THEN** the client sends one `POST /reports` and closes the modal on `201`

#### Scenario: Midnight split confirm

- **WHEN** the stop response contains two segments
- **THEN** the client sends one `POST /reports/batch` with two rows sharing the chosen hierarchy and location

#### Scenario: Under five minutes blocked

- **WHEN** the session elapsed time is under five minutes
- **THEN** confirm is disabled or submit shows the server validation error in Hebrew

### Requirement: Cancel discards draft

Closing or canceling the stop modal SHALL call `POST /me/clock/discard` and SHALL NOT create a report.

#### Scenario: User cancels

- **WHEN** the employee cancels the stop modal
- **THEN** no report is created and the home returns to idle clock state

### Requirement: Resume session across visits

On home load and window focus, the client SHALL refetch `GET /me/clock/session`. An `ACTIVE` session SHALL restore the running UI. An `AWAITING_CONFIRM` session (including after EOD auto-stop) SHALL open the stop/confirm modal with precomputed segment times.

#### Scenario: EOD auto-stop on next login

- **WHEN** the server returns `AWAITING_CONFIRM` with `autoStopped: true`
- **THEN** the confirm modal opens so the employee can complete hierarchy and save

### Requirement: Assigned-only options in modal

The stop modal SHALL load hierarchy options from `GET /me/reporting-options` and SHALL only list assigned tasks. An empty tree SHALL prevent confirm and explain that no tasks are assigned.

#### Scenario: No assignments in modal

- **WHEN** reporting options are empty during confirm
- **THEN** confirm stays disabled with a Hebrew empty-state message

### Requirement: Multiple sessions per day

After confirm or discard, the employee MAY start another clock session the same day. Each start/stop cycle SHALL be independent.

#### Scenario: Second session same day

- **WHEN** the employee completes one clock session and taps **הפעלת שעון** again
- **THEN** a new session starts if no other session is open
