## Purpose

Defines the `/admin/assignments` screen's observable behavior.

## ADDED Requirements

### Requirement: Admin can assign and unassign users to tasks from one screen
The frontend SHALL render a `/admin/assignments` screen where an admin
picks a user and a task to create an assignment, views existing
assignments, and removes one.

#### Scenario: Creating an assignment
- **WHEN** an admin picks a user and a task and confirms
- **THEN** the new assignment appears in the assignment list

#### Scenario: Removing an assignment
- **WHEN** an admin removes an existing assignment
- **THEN** it no longer appears in the assignment list
