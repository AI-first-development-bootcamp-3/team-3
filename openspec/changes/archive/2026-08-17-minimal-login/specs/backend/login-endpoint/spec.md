## Purpose

Password-based authentication that issues the JWTs `auth-middleware` verifies, plus self-service password change for the forced-change-on-first-login flow (SCRUM-209).

## ADDED Requirements

### Requirement: Password login

The service SHALL authenticate a caller by email and password, issuing a signed JWT and the caller's profile (including `mustChangePassword`) on success. Wrong password, unknown email, and an inactive account SHALL all be rejected identically with `401`, disclosing no information about which case occurred.

#### Scenario: Correct credentials, active account

- **WHEN** a request to `POST /login` supplies the email and correct password of an active user
- **THEN** the service responds `200` with a signed JWT and the user's profile, including their current `mustChangePassword` value

#### Scenario: Wrong password

- **WHEN** a request supplies a registered email with an incorrect password
- **THEN** the service responds `401` without indicating that the email was found

#### Scenario: Unknown email

- **WHEN** a request supplies an email with no matching account
- **THEN** the service responds `401`, identical to a wrong-password response for a real account

#### Scenario: Inactive account

- **WHEN** a request supplies correct credentials for an account marked inactive
- **THEN** the service responds `401`, identical to a wrong-password response

#### Scenario: Malformed request body

- **WHEN** a request to `POST /login` is missing `email`/`password` or supplies a malformed email
- **THEN** the service responds `400` using the standard error contract

### Requirement: Self-service password change

An authenticated caller SHALL be able to set a new password for their own account, which clears `mustChangePassword`. No prior-password confirmation is required — a valid session token is the identity check.

#### Scenario: Authenticated caller sets a new password

- **WHEN** an authenticated caller sends `PATCH /me/password` with a new password of at least 8 characters
- **THEN** the service responds `200` with their updated profile showing `mustChangePassword: false`
- **AND** a subsequent login with the new password succeeds

#### Scenario: Unauthenticated request rejected

- **WHEN** a request to `PATCH /me/password` carries no valid token
- **THEN** the service responds `401`

#### Scenario: Password too short

- **WHEN** an authenticated caller submits a new password under 8 characters
- **THEN** the service responds `400` using the standard error contract
