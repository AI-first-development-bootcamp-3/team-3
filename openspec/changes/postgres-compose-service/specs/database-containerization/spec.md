## Purpose
Defines the Postgres database service used for local development via Docker Compose.

## ADDED Requirements

### Requirement: Postgres Compose service
The local development stack SHALL provide a `postgres` service in `docker-compose.yml` using an official PostgreSQL image.

#### Scenario: Service starts with persistent storage
- **WHEN** `docker compose up postgres` is run
- **THEN** the container starts using the `postgres:16-alpine` image
- **AND** data is persisted to a named volume (`postgres-data`) that survives container restarts

#### Scenario: Credentials and database configured via environment
- **WHEN** the `postgres` service starts
- **THEN** `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` are set via the service's `environment` block
- **AND** these values match the backend's `DATABASE_URL` in `backend/.env.example`

#### Scenario: Port exposed for local access
- **WHEN** the `postgres` service is running
- **THEN** port 5432 is published to the host, allowing the backend (or external tools) to connect via `localhost:5432`
