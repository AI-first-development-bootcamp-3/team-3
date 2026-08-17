## MODIFIED Requirements

### Requirement: Password login

The service SHALL authenticate a caller by email and password, issuing a signed JWT and the caller's profile (including `mustChangePassword`) on success. Wrong password, unknown email, and an inactive account SHALL all be rejected identically with `401`, disclosing no information about which case occurred.

The request MAY include a `rememberMe` boolean, defaulting to `false` when absent. The issued token SHALL carry a fixed expiry determined solely by that flag — a short lifetime by default and an extended one when `rememberMe` is true — with both lifetimes supplied by deployment configuration rather than fixed in code. The expiry SHALL be absolute: it is set once at login and SHALL NOT be extended by subsequent activity.

#### Scenario: Correct credentials, active account

- **WHEN** a request to `POST /login` supplies the email and correct password of an active user
- **THEN** the service responds `200` with a signed JWT and the user's profile, including their current `mustChangePassword` value

#### Scenario: Login without rememberMe

- **WHEN** a request to `POST /login` supplies correct credentials and omits `rememberMe`, or sends it as `false`
- **THEN** the issued token expires after the configured short lifetime

#### Scenario: Login with rememberMe

- **WHEN** a request to `POST /login` supplies correct credentials and sends `rememberMe` as `true`
- **THEN** the issued token expires after the configured extended lifetime, which is longer than the short one

#### Scenario: rememberMe does not widen access

- **WHEN** a token issued with `rememberMe` set to `true` is used to call an authenticated endpoint
- **THEN** it grants exactly the same permissions as a token issued without it, differing only in expiry

#### Scenario: Malformed rememberMe value

- **WHEN** a request to `POST /login` supplies `rememberMe` as something other than a boolean
- **THEN** the service responds `400` using the standard error contract

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

#### Scenario: Too many failed attempts

- **WHEN** a request to `POST /login` arrives from a caller who has exceeded a configured attempt threshold within the window
- **THEN** the service responds `429` using the standard error contract, without checking the supplied password

#### Scenario: Locked email

- **WHEN** a request to `POST /login` supplies an email that has been locked for sustained failed attempts
- **THEN** the service responds `423` using the standard error contract, without checking the supplied password

#### Scenario: Locked response does not reveal registration

- **WHEN** a locked registered email and a locked unregistered email are each attempted
- **THEN** both receive `423` responses that are indistinguishable from one another

### Requirement: Expired tokens are rejected distinguishably

The service SHALL reject a request bearing an expired token with `401` and an error code that identifies
expiry specifically, so a client can tell "your session ran out" from "your token is invalid" and prompt a
fresh login rather than reporting a generic failure.

#### Scenario: Request with an expired token

- **WHEN** an authenticated endpoint is called with a token whose expiry has passed
- **THEN** the service responds `401` with an error code identifying the failure as expiry

#### Scenario: Request with a token that is invalid for another reason

- **WHEN** an authenticated endpoint is called with a token that is malformed or incorrectly signed
- **THEN** the service responds `401` without identifying it as an expiry
