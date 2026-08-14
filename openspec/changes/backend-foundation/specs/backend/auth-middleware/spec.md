## Purpose

Defines the authorization boundary that protected endpoints compose: verifying a caller's token and establishing their identity, then enforcing role-based access. Issuing tokens at login is a separate concern owned by the Auth epic.

## ADDED Requirements

### Requirement: Token verification

Protected endpoints SHALL require a signed bearer token. The service SHALL verify the token's signature and expiry before any business logic runs, and SHALL make the caller's identity and role available to the endpoint. Requests without a valid token SHALL be rejected with status `401`.

#### Scenario: Valid token establishes identity

- **WHEN** a request to a protected endpoint carries a validly signed, unexpired token
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

#### Scenario: Public endpoints remain reachable

- **WHEN** an unauthenticated request is made to an endpoint not marked protected
- **THEN** the request proceeds normally

### Requirement: Role-based authorization

The service SHALL support restricting endpoints to administrators. An authenticated caller lacking the required role SHALL be rejected with status `403`, distinguishing "not permitted" from "not authenticated".

#### Scenario: Administrator reaches restricted endpoint

- **WHEN** a caller whose role is administrator requests an admin-only endpoint with a valid token
- **THEN** the request proceeds

#### Scenario: Employee is refused a restricted endpoint

- **WHEN** a caller whose role is regular employee requests an admin-only endpoint with a valid token
- **THEN** the service responds `403` using the standard error contract

#### Scenario: Authentication precedes authorization

- **WHEN** a request to an admin-only endpoint carries no token at all
- **THEN** the service responds `401` rather than `403`

#### Scenario: Role is taken from the verified token

- **WHEN** a request supplies a role claim in its body or query string that contradicts the verified token
- **THEN** the role asserted by the token governs the decision
