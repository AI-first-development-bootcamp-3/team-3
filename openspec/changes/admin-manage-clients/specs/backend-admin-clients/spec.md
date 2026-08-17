## Purpose

Defines the admin-facing CRUD behavior for clients: what an admin can do to
a client record and what the system guarantees when they do it.

## ADDED Requirements

### Requirement: Admin can create a client
The backend SHALL let an admin create a client with a name and optional
contact details, active by default.

#### Scenario: Creating a client
- **WHEN** an admin submits a valid client name (with or without contact
  details)
- **THEN** a new client is created with active status true

### Requirement: Admin can edit a client
The backend SHALL let an admin update a client's name, contact details, and
active status.

#### Scenario: Editing client details
- **WHEN** an admin updates an existing client's name or contact details
- **THEN** the client record reflects the new values

### Requirement: Deleting a client is a soft-delete
The backend SHALL treat client deletion as setting active status to false,
never removing the record or its history.

#### Scenario: Deactivating a client
- **WHEN** an admin deactivates a client
- **THEN** the client's active flag becomes false and the record, along
  with any historical data referencing it, remains intact
