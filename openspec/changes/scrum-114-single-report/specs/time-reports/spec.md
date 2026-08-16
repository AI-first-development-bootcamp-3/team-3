## Purpose

Lets an authenticated employee or admin create a single daily time report against a client/project/task hierarchy and load the dropdown options for that form.

## ADDED Requirements

### Requirement: Create a time report

The service SHALL let an authenticated caller create a time report by submitting date, work location, start time, end time, client, project, task, and description. The stored `userId` SHALL be the JWT subject, never a body field. An unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Valid report is created

- **WHEN** an authenticated user submits `POST /reports` with a valid body whose client, project, and task form one active hierarchy and whose end time is not before start time
- **THEN** the service responds `201` with the persisted report including `id`, `userId`, and all submitted fields

#### Scenario: Unauthenticated caller is refused

- **WHEN** a request to `POST /reports` carries no valid token
- **THEN** the service responds `401` and creates no row

#### Scenario: End time before start time is rejected

- **WHEN** the body has `endTime` earlier than `startTime`
- **THEN** the service responds `400` and creates no row

#### Scenario: Hierarchy mismatch or inactive entity is rejected

- **WHEN** `taskId` does not belong to `projectId`, or `projectId` does not belong to `clientId`, or any of the three is missing or inactive
- **THEN** the service responds `400` and creates no row

#### Scenario: Malformed body is rejected

- **WHEN** a required field is missing, `workLocation` is not `OFFICE`/`CLIENT`/`HOME`, times are not `HH:mm`, or ids are not UUIDs
- **THEN** the service responds `400` with per-field details and creates no row

### Requirement: Reporting options for the entry form

The service SHALL expose the active client → project → task tree to any authenticated caller, sorted by name, so the entry form can cascade dropdowns. Until SCRUM-71, the tree SHALL include all active entities, not only assigned tasks.

#### Scenario: Authenticated caller loads options

- **WHEN** an authenticated user requests `GET /me/reporting-options`
- **THEN** the service responds `200` with nested `clients` (each with `projects`, each with `tasks`), only `isActive: true` rows, names sorted

#### Scenario: Unauthenticated caller is refused options

- **WHEN** `GET /me/reporting-options` carries no valid token
- **THEN** the service responds `401`

### Requirement: Hebrew single-report entry form

The home page (`/`) SHALL show a Hebrew RTL form for one report: date (default today), location, start/end time, cascading client → project → task (auto-select when exactly one option), and description. Saving SHALL call `POST /reports`, show success, and reset the form for a new entry. Empty hierarchy SHALL disable submit. Validation errors from `400` SHALL appear on the form.

#### Scenario: Employee saves a valid report

- **WHEN** a logged-in user fills all fields and submits
- **THEN** the client sends `POST /reports` and on `201` shows success feedback and resets the form (date still today)

#### Scenario: Single-option cascade auto-selects

- **WHEN** the options tree has exactly one client, or the selected client has exactly one project, or the selected project has exactly one task
- **THEN** that option is selected without an extra click
