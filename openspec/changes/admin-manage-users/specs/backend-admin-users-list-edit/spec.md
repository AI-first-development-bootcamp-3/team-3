## Purpose

Defines listing and editing users as an admin, complementing the already-
shipped create/reset-password/role-change behavior.

## ADDED Requirements

### Requirement: Admin can list users
The backend SHALL let an admin retrieve all users with full name, email,
role, and active status.

#### Scenario: Listing users
- **WHEN** an admin requests the user list
- **THEN** every user is returned with full name, email, role, and active
  status

### Requirement: Admin can edit a user's details and active status
The backend SHALL let an admin update a user's display name and active
status. Deactivation is a soft-delete: historical reports tied to that user
remain intact.

#### Scenario: Editing a user's display name
- **WHEN** an admin updates a user's display name
- **THEN** the user record reflects the new name

#### Scenario: Deactivating a user
- **WHEN** an admin sets a user's status to inactive
- **THEN** the user's active flag becomes false, and their historical
  reports remain unchanged and retrievable
