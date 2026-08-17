## Purpose

Defines the `/admin/users` screen's observable behavior, combining the
already-shipped create flow with the new list and edit capability.

## ADDED Requirements

### Requirement: Admin can view and manage users from one screen
The frontend SHALL render a `/admin/users` screen listing all users (full
name, email, role, status) with the ability to create, edit, and deactivate
a user.

#### Scenario: Viewing the user list
- **WHEN** an admin navigates to `/admin/users`
- **THEN** all users are listed with full name, email, role, and status

#### Scenario: Editing a user from the screen
- **WHEN** an admin updates a user's display name through the edit form
- **THEN** the updated name appears in the list

#### Scenario: Deactivating a user from the screen
- **WHEN** an admin deactivates a user through the form's toggle and
  confirms
- **THEN** the user's status in the list updates to inactive
