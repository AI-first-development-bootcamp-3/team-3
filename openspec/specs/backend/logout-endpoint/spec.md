# backend/logout-endpoint Specification

## Purpose
How an authenticated caller ends their own session server-side, so that a token they are finished with — or
one they believe has leaked — stops being accepted instead of remaining valid until it expires on its own.
## Requirements
### Requirement: Authenticated callers can end their session

The service SHALL offer an endpoint that ends the calling account's authenticated session. The endpoint
SHALL require a valid bearer token and SHALL identify whose session to end from that token alone, never
from the request body, so that no caller can end another account's session.

On success the endpoint SHALL respond with a success status and no body. It SHALL NOT require the caller to
supply the token a second time in the payload.

#### Scenario: Successful logout

- **WHEN** an authenticated caller requests logout with a valid token
- **THEN** the service responds with success and an empty body
- **AND** the caller's session is ended server-side

#### Scenario: Logout without a token

- **WHEN** a caller requests logout with no bearer token
- **THEN** the service responds `401` using the standard error contract
- **AND** no account's session is affected

#### Scenario: Logout with an already-invalid token

- **WHEN** a caller requests logout with a token that is expired, malformed, or already revoked
- **THEN** the service responds `401`
- **AND** no account's session is affected

#### Scenario: A caller cannot log out another account

- **WHEN** a caller requests logout and supplies a different account's identifier in the request body or query string
- **THEN** only the caller's own session is ended
- **AND** the other account's sessions continue to work

### Requirement: A logged-out token is refused afterwards

Once a session has been ended, the token that was used SHALL be refused by every protected endpoint for the
remainder of its natural lifetime. Refusal SHALL be reported as an authentication failure carrying a code
that distinguishes a deliberately ended session from an expired token and from a deactivated account, so
that a client can tell the user their session was ended rather than that it timed out.

#### Scenario: Reusing a token after logout

- **WHEN** a caller logs out and then uses the same token against a protected endpoint
- **THEN** the service responds `401`
- **AND** the response distinguishes an ended session from an expired token and from a deactivated account
- **AND** no business logic for that endpoint runs

#### Scenario: A copied token is also refused

- **WHEN** a token was captured by a third party before the account logged out, and is used after that logout
- **THEN** the service responds `401`

#### Scenario: Logging in again restores access

- **WHEN** an account logs out and then authenticates again with valid credentials
- **THEN** a new token is issued and works normally
- **AND** the token from before the logout remains refused

### Requirement: Logout ends every session for the account

Ending a session SHALL invalidate every token previously issued to that account, not only the token
presented with the logout request. Logging out on one device therefore SHALL end that account's sessions on
all other devices.

Logging in SHALL NOT end the account's other sessions — only an explicit logout does.

#### Scenario: Logout on one device ends another device's session

- **WHEN** an account holds valid tokens obtained from two separate logins, and logs out using one of them
- **THEN** the other token is also refused by protected endpoints

#### Scenario: Logging in does not disturb an existing session

- **WHEN** an account with an existing valid token authenticates again from a second device
- **THEN** both tokens work normally

### Requirement: Logout is idempotent

Requesting logout when the account has no active session, or repeating a logout, SHALL NOT be reported as an
error by the endpoint itself. A caller that still holds a usable token and logs out twice SHALL receive the
same success response both times; a caller whose token has already been revoked is refused by authentication
before the endpoint is reached, which is the ordinary `401` path rather than a logout-specific failure.

#### Scenario: Logout repeated with a still-valid token

- **WHEN** an account logs out and, within the same request, logs out again using a token that has not been revoked
- **THEN** the service responds with success both times
- **AND** no error is reported

#### Scenario: Logout repeated with the revoked token

- **WHEN** an account logs out and then requests logout again using the token that logout just revoked
- **THEN** the service responds `401` because authentication refuses the revoked token
- **AND** the account's state is unchanged

