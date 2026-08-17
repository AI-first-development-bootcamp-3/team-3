## Purpose

Defines admin management of user↔task assignments — the source of truth
for which tasks an employee can report against.

## ADDED Requirements

### Requirement: Admin can assign a user to a task
The backend SHALL let an admin assign a user directly to a task. Users
SHALL NOT be assignable to clients or projects.

#### Scenario: Assigning a user to a task
- **WHEN** an admin assigns a user to a task
- **THEN** that user↔task pair exists as an assignment

### Requirement: Admin can list assignments
The backend SHALL let an admin retrieve current assignments, filterable by
user or by task.

#### Scenario: Listing assignments for a task
- **WHEN** an admin requests assignments filtered by a task
- **THEN** every user currently assigned to that task is returned

### Requirement: Admin can remove an assignment without affecting history
The backend SHALL let an admin remove a user↔task assignment. Removing an
assignment SHALL NOT delete or modify any existing time report.

#### Scenario: Removing an assignment
- **WHEN** an admin removes a user's assignment from a task
- **THEN** that user↔task pair no longer exists as an assignment, and any
  time reports the user previously submitted against that task remain
  unchanged
