## Purpose

Automatically delivers a newly created user's temporary password by email, so an admin doesn't have to manually relay it. Falls back to logging when no SMTP provider is configured, so this never blocks account creation in an environment without one set up.

## ADDED Requirements

### Requirement: Credential email sent on user creation

The service SHALL send an email containing the new user's temporary password whenever an administrator creates a user account.

#### Scenario: User created successfully

- **WHEN** an administrator creates a user via `POST /admin/users`
- **THEN** an email is sent to the new user's address containing their temporary password

### Requirement: A failed send does not fail account creation

If sending the credential email fails, the service SHALL still complete the account creation and return `201`, logging the failure rather than surfacing it to the caller.

#### Scenario: Email delivery fails

- **WHEN** an administrator creates a user and the configured mail provider is unreachable or rejects the message
- **THEN** the service still responds `201` with the created user and their temporary password
- **AND** the user record exists in the database

### Requirement: No SMTP configuration required

When no SMTP provider is configured, the service SHALL log the credential email instead of failing or silently doing nothing.

#### Scenario: No SMTP host configured

- **WHEN** the service has no `SMTP_HOST` configured
- **THEN** creating a user still succeeds
- **AND** the credential email's content is logged rather than delivered
