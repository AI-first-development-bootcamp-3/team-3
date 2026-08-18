# backend/api-skeleton Specification

## Purpose
Defines how the backend HTTP service starts, reports its own health, and fails. Every endpoint added by later feature work inherits the error contract established here, so clients can handle failures uniformly across the whole API.
## Requirements
### Requirement: Service startup

The service SHALL start an HTTP listener on a port supplied by the environment, and SHALL refuse to start when required configuration is absent rather than starting in a partially configured state.

#### Scenario: Service starts with valid configuration

- **WHEN** the service is started with all required environment variables present
- **THEN** it listens for HTTP requests on the configured port
- **AND** it logs a startup message identifying the port and environment

#### Scenario: Service refuses to start without required configuration

- **WHEN** the service is started with a required environment variable missing or malformed
- **THEN** it exits with a non-zero status code
- **AND** it reports which variables were missing or invalid
- **AND** it does not begin accepting HTTP requests

### Requirement: Health check endpoint

The service SHALL expose an unauthenticated health endpoint at `GET /health` that reports whether the service is able to serve traffic. This endpoint is the readiness signal for container orchestration and deployment platforms.

#### Scenario: Service is healthy

- **WHEN** a client sends `GET /health` and the service can reach its database
- **THEN** the service responds with status `200`
- **AND** the body reports overall status and database connectivity

#### Scenario: Database is unreachable

- **WHEN** a client sends `GET /health` and the database cannot be reached
- **THEN** the service responds with status `503`
- **AND** the body identifies the database as the failing dependency

#### Scenario: Health check requires no credentials

- **WHEN** a client sends `GET /health` with no authentication token
- **THEN** the service responds normally rather than rejecting the request

### Requirement: Consistent error contract

The service SHALL return every error, from any endpoint, as a JSON object with the same shape: a machine-readable error code, a human-readable message, and — where the error concerns specific input fields — a list of per-field details. Error responses SHALL NOT expose stack traces, SQL fragments, or internal file paths.

#### Scenario: Handled error returns the standard shape

- **WHEN** any endpoint rejects a request for a known reason
- **THEN** the response body contains a machine-readable code, a human-readable message, and an appropriate HTTP status
- **AND** the body shape is identical to that of every other error in the API

#### Scenario: Unexpected error is sanitised

- **WHEN** an endpoint throws an unanticipated error
- **THEN** the service responds with status `500` and a generic message
- **AND** the response body contains no stack trace, database detail, or filesystem path
- **AND** the full error detail is written to the service log for diagnosis

#### Scenario: Unknown route

- **WHEN** a client requests a path that no route handles
- **THEN** the service responds with status `404` using the standard error shape

#### Scenario: Failure inside asynchronous handling

- **WHEN** an endpoint's asynchronous work rejects
- **THEN** the failure is caught and converted into the standard error shape
- **AND** the request does not hang until timeout

