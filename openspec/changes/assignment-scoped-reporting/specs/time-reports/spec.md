## ADDED Requirements

### Requirement: Reporting requires an assignment to the task

The service SHALL refuse to create a time report against a task the caller is
not assigned to, whether submitted through `POST /reports` or as a row of
`POST /reports/batch`. The rejection SHALL be a `400` naming the row's
`taskId`, distinct from the hierarchy error, and nothing from that request
SHALL be stored. The rule SHALL apply to every role — an admin reporting
their own time is scoped by their assignments exactly as an employee is.

A row that already exists for that caller, date, project, and task SHALL
remain saveable even once the assignment is gone, so that withdrawing an
assignment cannot strand a day the person already reported. A genuinely new
row on an unassigned task SHALL still be refused.

#### Scenario: Unassigned task is refused

- **WHEN** an authenticated user submits `POST /reports` naming a task they
  hold no assignment for
- **THEN** the service responds `400` naming `taskId` and creates no row

#### Scenario: One unassigned row rejects the whole day

- **WHEN** a `POST /reports/batch` carries one assigned row and one row on an
  unassigned task
- **THEN** the service responds `400` naming that row's `rows.<index>.taskId`
  and stores nothing

#### Scenario: An admin is scoped by assignment too

- **WHEN** a caller whose role is `ADMIN` reports against a task they hold no
  assignment for
- **THEN** the service responds `400` exactly as it would for an employee

#### Scenario: A day already reported survives losing the assignment

- **WHEN** a day holding a stored row for a task is submitted again after
  that assignment has been removed
- **THEN** the service responds `201` and the row is stored

#### Scenario: A new row on an unassigned task is still refused

- **WHEN** a day that already holds stored rows is submitted with an
  additional row on a task the caller is not assigned to
- **THEN** the service responds `400` and stores nothing

## MODIFIED Requirements

### Requirement: Reporting options for the entry form

The service SHALL expose to an authenticated caller the active client →
project → task tree **limited to the tasks that caller is assigned to**,
sorted by name, so the entry form can cascade dropdowns over work the person
may actually report against. Projects left with no assigned task, and clients
left with no project, SHALL be omitted. Each project in the tree SHALL carry
its `reportFormat` (`SUM_HOURS` or `CLOCK_IN_OUT`) so the form can render the
right inputs before the user submits anything. The scoping SHALL apply to
every role.

#### Scenario: Authenticated caller loads options

- **WHEN** an authenticated user requests `GET /me/reporting-options`
- **THEN** the service responds `200` with nested `clients` (each with
  `projects`, each with `tasks`), only `isActive: true` rows, names sorted

#### Scenario: Only assigned tasks are offered

- **WHEN** an authenticated user is assigned to some but not all active tasks
- **THEN** the tree holds exactly their assigned tasks, and omits every
  project and client left with nothing

#### Scenario: A caller with no assignments gets an empty tree

- **WHEN** an authenticated user holds no assignments
- **THEN** the service responds `200` with an empty `clients` array

#### Scenario: Each project reports its format

- **WHEN** an authenticated user requests `GET /me/reporting-options` and
  one project is set to `CLOCK_IN_OUT` while another is `SUM_HOURS`
- **THEN** each project object carries its own `reportFormat` value

#### Scenario: Unauthenticated caller is refused options

- **WHEN** `GET /me/reporting-options` carries no valid token
- **THEN** the service responds `401`
