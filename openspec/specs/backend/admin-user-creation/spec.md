# backend/admin-user-creation Specification

## Purpose
Lets an administrator create a new user account with a temporary password, since self-registration doesn't exist by design (only the admin registers users).
## Requirements
### Requirement: Administrator-only user creation

The service SHALL let an authenticated administrator create a user account by supplying an email, display name, and role. The created user SHALL have `mustChangePassword` set to true. A caller who is authenticated but not an administrator SHALL be rejected with `403`; an unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Administrator creates a user with a generated password

- **WHEN** an administrator submits `POST /admin/users` with a valid email, display name, and role, and no temporary password
- **THEN** the service responds `201` with the created user (including `mustChangePassword: true`) and a generated temporary password, and does not include the password hash anywhere in the response

#### Scenario: Administrator supplies their own temporary password

- **WHEN** an administrator submits a request that includes a `temporaryPassword` of at least 8 characters
- **THEN** the service responds `201` and the created user's temporary password is exactly the one supplied

#### Scenario: Non-administrator is refused

- **WHEN** an authenticated non-administrator submits `POST /admin/users`
- **THEN** the service responds `403`

#### Scenario: Unauthenticated caller is refused

- **WHEN** a request to `POST /admin/users` carries no valid token
- **THEN** the service responds `401`

### Requirement: Duplicate email is rejected

The service SHALL reject creation of a user whose email already exists with `409`, distinguishing a conflict with existing state from a malformed request.

#### Scenario: Email already in use

- **WHEN** an administrator submits `POST /admin/users` with an email that already belongs to an existing user
- **THEN** the service responds `409` and creates no new row

### Requirement: Input validation

The service SHALL reject a request missing a required field, with an invalid email format, an unrecognized role, or a supplied temporary password under 8 characters, with `400` and per-field detail. No user SHALL be created from an invalid request.

#### Scenario: Missing or malformed fields

- **WHEN** a request to `POST /admin/users` is missing `displayName`, has a malformed `email`, or specifies a `role` outside the recognized set
- **THEN** the service responds `400` with per-field validation details
- **AND** no user is created

#### Scenario: Supplied temporary password too short

- **WHEN** a request supplies a `temporaryPassword` under 8 characters
- **THEN** the service responds `400`

