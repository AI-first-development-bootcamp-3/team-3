## Purpose
Defines how the backend service is packaged into a Docker image for local development and production use.

## ADDED Requirements

### Requirement: Multi-stage backend image
The backend Docker image SHALL be built via a multi-stage Dockerfile providing distinct `dev` and `production` build targets.

#### Scenario: Production target build
- **WHEN** `docker build --target production` is run against `backend/`
- **THEN** the image builds successfully and contains the compiled `dist/` output plus the generated Prisma client
- **AND** the container's default command runs `node dist/server.js`

#### Scenario: Dev target build
- **WHEN** `docker build --target dev` is run against `backend/`
- **THEN** the image builds successfully and contains the TypeScript source plus dev dependencies
- **AND** the container's default command runs `npm run dev` (`tsx watch`) for hot reload

### Requirement: Runtime configuration via environment
The backend image SHALL NOT bake database or secret configuration into the image at build time; required runtime configuration SHALL be supplied via container environment variables.

#### Scenario: Missing required env var
- **WHEN** the container starts without `DATABASE_URL`, `JWT_SECRET`, or `CORS_ORIGIN` set
- **THEN** the process exits non-zero on startup per existing `env.ts` validation, rather than silently running with defaults
