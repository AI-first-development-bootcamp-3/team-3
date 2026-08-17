## Purpose

Defines the `/admin/clients` screen's observable behavior: what an admin
sees and can do there, built on the shared admin table/form patterns.

## ADDED Requirements

### Requirement: Admin can view and manage clients from one screen
The frontend SHALL render a `/admin/clients` screen listing all clients
(name, status) with the ability to create a new client and edit an existing
one.

#### Scenario: Viewing the client list
- **WHEN** an admin navigates to `/admin/clients`
- **THEN** all clients are listed with their name and active/inactive status

#### Scenario: Creating a client from the screen
- **WHEN** an admin submits the new-client form with a valid name
- **THEN** the new client appears in the list as active

#### Scenario: Deactivating a client from the screen
- **WHEN** an admin deactivates a client through the form's toggle and
  confirms
- **THEN** the client's status in the list updates to inactive
