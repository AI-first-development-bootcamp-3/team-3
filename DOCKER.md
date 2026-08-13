# Running with Docker

Short guide to running the full stack (frontend, backend, Postgres) locally via Docker Compose. For general project setup, see the main README (Documentation epic).

## Prerequisites
- Docker Desktop (or Docker Engine + the Compose plugin)

## First run
1. Copy the example env file: `cp .env.example .env`
2. Build and start everything: `docker compose up --build`

## Ports

| Service  | Port | URL                    |
|----------|------|-------------------------|
| frontend | 5173 | http://localhost:5173  |
| backend  | 3000 | http://localhost:3000  |
| postgres | 5432 | localhost:5432          |

## Common commands
- Start (after the first build): `docker compose up`
- Rebuild a single service after code/dependency changes: `docker compose up --build <service>` (e.g. `docker compose up --build backend`)
- Stop everything: `docker compose down`
- Stop and wipe the Postgres volume (fresh database): `docker compose down -v`
- Tail logs for one service: `docker compose logs -f backend`

## Notes
- `.env` values here are for local development only - not for any shared/staging/production environment.
- Full project setup docs live elsewhere (Documentation epic); this file only covers the Docker workflow.
