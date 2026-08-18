## MODIFIED Requirements

### Requirement: Reporting options for the entry form

The service SHALL expose the active client → project → task tree to any authenticated caller, sorted by name, so entry forms can cascade dropdowns. The tree SHALL include only clients, projects, and tasks where the caller is assigned to the task. Unassigned active entities MUST NOT appear.

#### Scenario: Authenticated caller loads assigned options

- **WHEN** an authenticated employee requests `GET /me/reporting-options`
- **THEN** the service responds `200` with nested active entities limited to the caller's task assignments, names sorted

#### Scenario: Unauthenticated caller is refused options

- **WHEN** `GET /me/reporting-options` carries no valid token
- **THEN** the service responds `401`

#### Scenario: No assignments returns empty tree

- **WHEN** the employee has no task assignments
- **THEN** the service responds `200` with an empty `clients` array

### Requirement: Clock confirm uses standard report writes

Clock-confirmed rows SHALL be created through the existing single-report and batch-report write requirements without a separate persistence shape. Clock-created rows SHALL be editable under the same rules as manually created rows until month lock.

#### Scenario: Clock row is a normal report

- **WHEN** the employee confirms a stopped clock session with one segment
- **THEN** the created row is persisted via `POST /reports` and behaves like any other report on later edit

#### Scenario: Split clock rows use batch

- **WHEN** the employee confirms a midnight-split session with two segments
- **THEN** both rows are persisted atomically via `POST /reports/batch`
