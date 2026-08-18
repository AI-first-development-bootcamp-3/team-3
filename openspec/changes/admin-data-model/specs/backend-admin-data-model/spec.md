## Purpose

Defines the persisted relationships and lifecycle state the admin epic's
CRUD stories (SCRUM-67 through SCRUM-71, SCRUM-215) build on: which entities
can be assigned to which, and how a task's open/closed status is tracked
separately from soft-delete.

## ADDED Requirements

### Requirement: Users can be assigned to tasks
The system SHALL support a many-to-many assignment between users and tasks,
where a given user↔task pair is either assigned or not assigned — there is
no assignment history record, only current state.

#### Scenario: Assigning a user to a task
- **WHEN** an admin assigns a user to a task they are not yet assigned to
- **THEN** the system records that user↔task pair as assigned

#### Scenario: Removing an assignment
- **WHEN** an admin removes a user's assignment from a task
- **THEN** the system no longer reflects that user↔task pair as assigned,
  and no record of the prior assignment is retained

#### Scenario: Duplicate assignment is a no-op, not an error
- **WHEN** an admin assigns a user to a task they are already assigned to
- **THEN** the system leaves the existing assignment unchanged and does not
  create a duplicate

### Requirement: Tasks have an open/closed status independent of soft-delete
The system SHALL track whether a task is open or closed as a status distinct
from whether the task is active (soft-deleted). A task defaults to open when
created.

#### Scenario: New task defaults to open
- **WHEN** a task is created
- **THEN** its status is open

#### Scenario: Closing a task does not soft-delete it
- **WHEN** an admin closes a task
- **THEN** the task's status becomes closed, and the task remains active
  (not soft-deleted) and still visible in task listings

#### Scenario: Soft-deleting a task does not change its open/closed status
- **WHEN** an admin deactivates (soft-deletes) a task
- **THEN** the task's active flag becomes false, and its open/closed status
  is unchanged
