## Purpose

Defines admin CRUD behavior for projects, including the constraint that a
project can only be created under an active client and that deactivating a
client never cascades to its projects.

## ADDED Requirements

### Requirement: Admin can create a project under an active client
The backend SHALL let an admin create a project with a name and a client,
where the client must be active at creation time, and the project defaults
to active.

#### Scenario: Creating a project under an active client
- **WHEN** an admin submits a project name and an active client
- **THEN** a new project is created, active, linked to that client

#### Scenario: Creating a project under an inactive client is rejected
- **WHEN** an admin attempts to create a project under a client that is
  inactive
- **THEN** the request is rejected and no project is created

### Requirement: Admin can edit a project
The backend SHALL let an admin update a project's name and active status.

#### Scenario: Editing project details
- **WHEN** an admin updates an existing project's name
- **THEN** the project record reflects the new name

### Requirement: Deleting a project is a soft-delete
The backend SHALL treat project deletion as setting active status to false,
never removing the record or its history.

#### Scenario: Deactivating a project
- **WHEN** an admin deactivates a project
- **THEN** the project's active flag becomes false and historical data
  referencing it remains intact

### Requirement: Deactivating a client does not affect its projects
The backend SHALL leave a project's active status unchanged when its client
is deactivated.

#### Scenario: Client is deactivated while its project is active
- **WHEN** an admin deactivates a client that has an active project
- **THEN** that project's active status remains true
