# local-docker-docs Specification

## Purpose
Defines the documented environment contract and instructions for running the Dockerized stack locally.
## Requirements
### Requirement: Documented environment variables for Compose
The repository SHALL provide a root `.env.example` listing every environment variable the Docker Compose stack requires, with working default values.

#### Scenario: Copying the example file produces a working stack
- **WHEN** a developer runs `cp .env.example .env`
- **THEN** the resulting `.env` contains valid values for Postgres credentials, backend config, and the frontend API URL sufficient to bring up the full stack

### Requirement: Short local-run documentation
The repository SHALL provide short, dedicated documentation (not the full project README) covering how to run the stack via Docker Compose.

#### Scenario: Developer follows the run notes
- **WHEN** a developer reads the Docker run notes
- **THEN** they find the command to bring up the stack (`docker compose up --build`), the ports each service is exposed on, and how to rebuild a service after code changes

