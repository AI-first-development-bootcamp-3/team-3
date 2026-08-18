# backend/api-documentation Specification

## Purpose
Defines browsable, machine-readable API documentation served by the running service, wired up before feature endpoints exist so that documentation accrues alongside each endpoint rather than being reconstructed at the end of the project.
## Requirements
### Requirement: Interactive API documentation

The service SHALL serve interactive API documentation from a dedicated route, generated from annotations that live alongside the route definitions they describe.

#### Scenario: Documentation is browsable

- **WHEN** a developer opens the documentation route in a browser
- **THEN** a rendered API reference is displayed listing the documented endpoints

#### Scenario: Machine-readable specification is available

- **WHEN** a client requests the underlying specification document
- **THEN** a valid OpenAPI document is returned

#### Scenario: Documentation is generated from route annotations

- **WHEN** a new endpoint is added with documentation annotations
- **THEN** it appears in the reference without a separate document being edited

#### Scenario: Health endpoint serves as the worked example

- **WHEN** the documentation is first published
- **THEN** the health endpoint is documented with its responses, demonstrating the pattern later endpoints follow

### Requirement: Documented authentication scheme

The documentation SHALL declare the API's bearer-token authentication scheme so that protected endpoints can be exercised from the documentation UI once login exists.

#### Scenario: Security scheme is declared

- **WHEN** the specification document is inspected
- **THEN** it declares a bearer-token security scheme

#### Scenario: Credentials can be supplied interactively

- **WHEN** a developer supplies a token in the documentation UI
- **THEN** requests issued from the UI carry that token

