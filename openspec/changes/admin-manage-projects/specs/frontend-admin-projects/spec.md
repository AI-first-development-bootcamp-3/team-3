## Purpose

Defines the `/admin/projects` screen's observable behavior, built on the
shared admin table/form patterns.

## ADDED Requirements

### Requirement: Admin can view and manage projects from one screen
The frontend SHALL render a `/admin/projects` screen listing all projects
(name, client, status), with the ability to create a project (choosing only
from active clients) and edit an existing one.

#### Scenario: Viewing the project list
- **WHEN** an admin navigates to `/admin/projects`
- **THEN** all projects are listed with name, client, and status

#### Scenario: Client picker only offers active clients
- **WHEN** an admin opens the create-project form
- **THEN** the client picker lists only active clients

#### Scenario: Deactivating a project from the screen
- **WHEN** an admin deactivates a project through the form's toggle and
  confirms
- **THEN** the project's status in the list updates to inactive
