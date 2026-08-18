## Purpose

Defines admin CRUD behavior for tasks, where closing a task (not
deactivating it) is the "delete" operation that preserves reporting history.

## ADDED Requirements

### Requirement: Admin can create a task under a project
The backend SHALL let an admin create a task with a name, optional
description, and a project, defaulting to open status.

#### Scenario: Creating a task
- **WHEN** an admin submits a task name and a project
- **THEN** a new task is created with status open, linked to that project

### Requirement: Admin can edit a task
The backend SHALL let an admin update a task's name, description, and
status.

#### Scenario: Editing task details
- **WHEN** an admin updates an existing task's name or description
- **THEN** the task record reflects the new values

### Requirement: Closing a task is how a task is "deleted"
The backend SHALL treat task deletion as setting the task's status to
closed, never removing the record or the historical reports referencing it.

#### Scenario: Closing a task
- **WHEN** an admin closes a task
- **THEN** the task's status becomes closed and all historical reports
  referencing it remain intact and retrievable
