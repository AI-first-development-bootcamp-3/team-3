# frontend-forms Specification

## Purpose
The app's form-handling pattern — how a form's validation rules are defined, checked and surfaced to the
user — so every Story's form (reporting, absences, admin CRUD) follows one consistent shape instead of
each hand-rolling its own validation.
## Requirements
### Requirement: Schema-driven form validation
The frontend SHALL validate form input against a declared schema rather than ad-hoc per-field checks,
so validation logic is defined once, is independently testable, and is consistent across every form.

#### Scenario: Required field left empty
- **WHEN** a form is submitted with a required field left empty
- **THEN** submission is blocked and an inline error is shown against that field

#### Scenario: Cross-field rule violated
- **WHEN** a form is submitted with values that individually pass but together violate a cross-field
  rule (e.g. an end time before its start time)
- **THEN** submission is blocked and an inline error identifies the violated rule

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

