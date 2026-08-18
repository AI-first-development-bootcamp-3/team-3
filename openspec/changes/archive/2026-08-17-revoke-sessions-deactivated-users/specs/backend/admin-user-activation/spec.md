## Purpose

Lets an administrator switch a user account between active and deactivated, so that an employee who leaves can be locked out and an account deactivated by mistake can be restored without database access. Deactivation is the lever that `backend/auth-middleware` enforces on every request.

## ADDED Requirements

### Requirement: Administrator-only activation control

The service SHALL let an authenticated administrator set a user account's active state through a single endpoint that both deactivates and reactivates, so the action is reversible. The endpoint SHALL report the account's resulting state. A caller who is authenticated but not an administrator SHALL be rejected with `403`; an unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Administrator deactivates an account

- **WHEN** an administrator submits `PATCH /admin/users/{id}/status` with `{ "isActive": false }` for an active user
- **THEN** the service responds `200` with the updated user showing `isActive: false`
- **AND** the response does not include the password hash

#### Scenario: Administrator reactivates an account

- **WHEN** an administrator submits `PATCH /admin/users/{id}/status` with `{ "isActive": true }` for a previously deactivated user
- **THEN** the service responds `200` with the updated user showing `isActive: true`

#### Scenario: A deactivated account is still addressable

- **WHEN** an administrator targets a user who is already deactivated
- **THEN** the service finds that account rather than reporting it missing, so a deactivation can always be undone

#### Scenario: Setting the state an account already has

- **WHEN** an administrator sets `isActive` to the value the account already holds
- **THEN** the service responds `200` with that state and treats the request as successful

#### Scenario: Non-administrator is refused

- **WHEN** an authenticated non-administrator submits `PATCH /admin/users/{id}/status`
- **THEN** the service responds `403`
- **AND** the target account's state is unchanged

#### Scenario: Unauthenticated caller is refused

- **WHEN** a request to `PATCH /admin/users/{id}/status` carries no valid token
- **THEN** the service responds `401`

### Requirement: Deactivation ends the account's access

Deactivating an account SHALL take effect for that account's existing sessions, not only for future logins. A token issued before deactivation SHALL stop being accepted, and the account SHALL be unable to log in again while deactivated.

#### Scenario: An existing session stops working

- **WHEN** a user holds an unexpired token and an administrator deactivates their account
- **THEN** their next request to any protected endpoint is refused `401`

#### Scenario: A deactivated user cannot log back in

- **WHEN** a deactivated user submits correct credentials to the login endpoint
- **THEN** the service refuses the login with the same generic response used for wrong credentials

#### Scenario: Reactivation restores login

- **WHEN** an administrator reactivates an account and the user submits correct credentials
- **THEN** the login succeeds and issues a token

### Requirement: Activation input validation

The service SHALL reject a request with a malformed user identifier or a missing or non-boolean `isActive` value with `400` and per-field detail, and SHALL respond `404` when no account matches the identifier. No account state SHALL change from a rejected request.

#### Scenario: Missing or non-boolean isActive

- **WHEN** a request omits `isActive` or supplies a value that is not a boolean
- **THEN** the service responds `400` with per-field validation details
- **AND** no account state changes

#### Scenario: Malformed identifier

- **WHEN** a request supplies an identifier that is not a well-formed user id
- **THEN** the service responds `400`

#### Scenario: Unknown user

- **WHEN** a request supplies a well-formed identifier matching no account
- **THEN** the service responds `404`
