# backend/request-pipeline Specification

## Purpose
Defines the cross-cutting treatment every incoming request receives before it reaches business logic — input validation, observability, and browser security controls — so feature endpoints do not each reimplement these concerns.
## Requirements
### Requirement: Request validation

Endpoints SHALL validate incoming request bodies, path parameters, and query parameters against a declared schema before business logic runs. Requests failing validation SHALL be rejected with status `400` and per-field detail identifying every failure, not merely the first.

#### Scenario: Valid request proceeds

- **WHEN** a request satisfies its endpoint's declared schema
- **THEN** it reaches the endpoint's business logic
- **AND** the validated data is typed according to that schema

#### Scenario: Missing required field

- **WHEN** a request omits a required field
- **THEN** the service responds `400` using the standard error contract
- **AND** the response identifies the missing field by name

#### Scenario: Wrong field type

- **WHEN** a request supplies a field of the wrong type
- **THEN** the service responds `400`
- **AND** the response identifies the offending field and the expected type

#### Scenario: All failures reported together

- **WHEN** a request violates its schema in three separate fields
- **THEN** the response details all three failures in one response

#### Scenario: Unexpected fields do not reach business logic

- **WHEN** a request body carries fields absent from the schema
- **THEN** those fields are stripped before business logic runs

### Requirement: Structured request logging

The service SHALL emit one machine-parseable log record per HTTP request, capturing method, path, response status, and duration. Log verbosity SHALL be configurable by environment. Logs SHALL NOT record credentials, tokens, or password fields.

#### Scenario: Completed request is logged

- **WHEN** a request completes
- **THEN** a structured record is emitted containing method, path, status code, and elapsed duration

#### Scenario: Records are correlatable

- **WHEN** a single request produces multiple log records
- **THEN** those records share an identifier that distinguishes them from concurrent requests

#### Scenario: Verbosity follows configuration

- **WHEN** the configured log level is set to suppress debug output
- **THEN** debug records are not emitted, while warnings and errors still are

#### Scenario: Secrets are never logged

- **WHEN** a request carries an authorization header or a password field
- **THEN** the emitted log records omit or redact those values

### Requirement: Cross-origin access control

The service SHALL accept browser requests only from explicitly configured origins, supplied by environment so that development, containerised, and deployed frontends can each be permitted without a code change.

#### Scenario: Configured origin is permitted

- **WHEN** a browser request arrives from an origin present in the configured allowlist
- **THEN** the response permits the cross-origin request

#### Scenario: Unconfigured origin is refused

- **WHEN** a browser request arrives from an origin absent from the allowlist
- **THEN** the response does not grant cross-origin access

#### Scenario: Credentialed requests are supported

- **WHEN** the frontend sends a request carrying authentication from an allowed origin
- **THEN** the credentials are accepted and the response permits them

### Requirement: HTTP security headers

Every response SHALL carry security headers that mitigate common browser-based attacks, and SHALL NOT advertise the underlying server technology.

#### Scenario: Security headers present

- **WHEN** any endpoint returns a response
- **THEN** the response carries headers preventing MIME-type sniffing and clickjacking

#### Scenario: Technology is not advertised

- **WHEN** any endpoint returns a response
- **THEN** no header discloses the server framework or its version

