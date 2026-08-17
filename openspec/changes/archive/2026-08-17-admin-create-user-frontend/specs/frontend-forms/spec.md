## ADDED Requirements

### Requirement: Admin can create a user via a schema-validated form

The frontend SHALL provide a form, reachable only by an administrator, that creates a user account by submitting a full name, email, role, and optional temporary password to the backend.

#### Scenario: Valid submission creates a user

- **WHEN** an administrator submits the create-user form with a valid name, email, and role
- **THEN** a user is created and the admin sees confirmation including the temporary password

#### Scenario: Required fields are validated before submission

- **WHEN** an administrator submits the form with a missing name or email
- **THEN** inline validation errors are shown and no request is sent

### Requirement: Duplicate email surfaces as a field-level error

When the backend rejects a submission because the email is already in use, the frontend SHALL show that error on the email field specifically, not as a generic notification.

#### Scenario: Email already exists

- **WHEN** an administrator submits the form with an email already belonging to an existing user
- **THEN** an inline error appears under the email field stating the email is already in use
- **AND** the other field values are preserved for correction
