## MODIFIED Requirements

### Requirement: Password login

The service SHALL authenticate a caller by email and password, issuing a signed JWT and the caller's profile (including `mustChangePassword`) on success. Wrong password, unknown email, and an inactive account SHALL all be rejected identically with `401`, disclosing no information about which case occurred.

The request MAY include a `rememberMe` boolean, defaulting to `false` when absent. The issued token SHALL carry a fixed expiry determined solely by that flag — a short lifetime by default and an extended one when `rememberMe` is true — with both lifetimes supplied by deployment configuration rather than fixed in code. The expiry SHALL be absolute: it is set once at login and SHALL NOT be extended by subsequent activity.

Attempts SHALL be subject to the throttling defined by `backend/login-rate-limiting`. A request refused for exceeding a threshold SHALL be rejected with `429` before its password is checked, so a throttled response does not depend on whether the supplied credentials were correct.

Attempts SHALL also be subject to the locking defined by `backend/login-account-lockout`. A request for a locked email SHALL be rejected with `423` before its password is checked. Because the lock is keyed on the submitted email whether or not an account exists, a `423` SHALL NOT disclose whether the email is registered.

Every failed attempt SHALL be recorded as required by `backend/login-attempt-audit`.

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
