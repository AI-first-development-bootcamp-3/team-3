## MODIFIED Requirements

### Requirement: Token verification

Protected endpoints SHALL require a signed bearer token. The service SHALL verify the token's signature and expiry, and SHALL confirm that the account the token identifies still exists and is active, before any business logic runs. It SHALL make the caller's identity and role available to the endpoint. Requests without a valid token, or whose account no longer exists or is no longer active, SHALL be rejected with status `401`.

The account check SHALL apply to every protected endpoint without per-endpoint opt-in, and SHALL reflect the account's state at the time of the request rather than at the time the token was issued.

#### Scenario: Valid token establishes identity

- **WHEN** a request to a protected endpoint carries a validly signed, unexpired token for an active account
- **THEN** the request proceeds
- **AND** the caller's user identifier and role are available to the endpoint

#### Scenario: Missing token

- **WHEN** a request to a protected endpoint carries no bearer token
- **THEN** the service responds `401` using the standard error contract

#### Scenario: Malformed or wrongly signed token

- **WHEN** a request carries a token that is malformed or not signed by the service's key
- **THEN** the service responds `401`
- **AND** the response does not disclose why verification failed

#### Scenario: Expired token

- **WHEN** a request carries a correctly signed token whose expiry has passed
- **THEN** the service responds `401`
- **AND** the response distinguishes expiry from other failures, so clients can prompt re-authentication

#### Scenario: Deactivated account is refused

- **WHEN** a request carries a validly signed, unexpired token whose account has since been deactivated
- **THEN** the service responds `401`
- **AND** the response carries a code distinguishing a revoked account from an expired token, so clients need not present it as an ordinary session timeout
- **AND** no business logic for the endpoint runs

#### Scenario: Deactivated administrator loses administrative access

- **WHEN** a deactivated administrator uses their still-unexpired token against any admin-only endpoint
- **THEN** the service responds `401`
- **AND** no account is created, no password is reset, and no role is changed

#### Scenario: Token for an account that no longer exists

- **WHEN** a request carries a validly signed, unexpired token whose subject matches no stored account
- **THEN** the service responds `401`

#### Scenario: Reactivated account regains access with the same token

- **WHEN** an account is deactivated and later reactivated, and a token issued before the deactivation has not yet expired
- **THEN** a request carrying that token proceeds normally

#### Scenario: Public endpoints remain reachable

- **WHEN** an unauthenticated request is made to an endpoint not marked protected
- **THEN** the request proceeds normally
- **AND** no account lookup is performed

### Requirement: Role-based authorization

The service SHALL support restricting endpoints to administrators. Authorization SHALL be decided from the role currently stored for the caller's account, not the role claimed by the token, so that a role change takes effect on the caller's next request rather than at their next login. An authenticated caller lacking the required role SHALL be rejected with status `403`, distinguishing "not permitted" from "not authenticated".

#### Scenario: Administrator reaches restricted endpoint

- **WHEN** a caller whose stored role is administrator requests an admin-only endpoint with a valid token
- **THEN** the request proceeds

#### Scenario: Employee is refused a restricted endpoint

- **WHEN** a caller whose stored role is regular employee requests an admin-only endpoint with a valid token
- **THEN** the service responds `403` using the standard error contract

#### Scenario: Authentication precedes authorization

- **WHEN** a request to an admin-only endpoint carries no token at all
- **THEN** the service responds `401` rather than `403`

#### Scenario: Role is taken from the stored account, not the token

- **WHEN** a caller's role is changed from administrator to regular employee while they hold an unexpired token minted with the administrator claim
- **THEN** their next request to an admin-only endpoint is refused `403`

#### Scenario: A promoted caller gains access without re-authenticating

- **WHEN** a caller's role is changed from regular employee to administrator while they hold an unexpired token minted with the employee claim
- **THEN** their next request to an admin-only endpoint proceeds

#### Scenario: Role supplied by the request is ignored

- **WHEN** a request supplies a role claim in its body or query string that contradicts the caller's stored role
- **THEN** the stored role governs the decision
