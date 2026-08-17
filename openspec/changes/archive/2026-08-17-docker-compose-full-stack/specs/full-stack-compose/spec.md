## Purpose
Defines how the frontend, backend, and database services are wired together in a single Docker Compose stack for local development.

## ADDED Requirements

### Requirement: Full stack composed together
`docker-compose.yml` SHALL define `frontend`, `backend`, and `postgres` services that can be started together.

#### Scenario: All services start
- **WHEN** `docker compose up` is run
- **THEN** the `postgres`, `backend`, and `frontend` services all start successfully

### Requirement: Shared network
All services SHALL share a common Docker network enabling service-to-service communication.

#### Scenario: Backend reaches Postgres by service name
- **WHEN** the backend service starts
- **THEN** it connects to Postgres via the internal hostname `postgres`, not `localhost`

### Requirement: Backend connects to the database via DATABASE_URL
The backend service SHALL receive its `DATABASE_URL` via Compose environment configuration, pointing at the `postgres` service.

#### Scenario: Backend starts with a valid DATABASE_URL
- **WHEN** the backend service starts
- **THEN** `DATABASE_URL` resolves to `postgresql://postgres:postgres@postgres:5432/abra_dev`

### Requirement: Frontend points at a browser-reachable backend API URL
The frontend service SHALL be configured with an API base URL that is reachable from the host browser, not only from within the Docker network.

#### Scenario: Frontend configured with a host-reachable API URL
- **WHEN** the frontend dev server starts
- **THEN** `VITE_API_URL` is set to `http://localhost:3000` (the backend's host-published port), not an internal-only service name
