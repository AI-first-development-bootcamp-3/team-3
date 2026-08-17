## Why
`backend-foundation` (SCRUM-11) explicitly deferred containerization: "No Dockerfile or CI/CD pipeline — separate Jira tasks (SCRUM-27, SCRUM-35) under the same epic." The backend now has a working Express 5 + Prisma + TypeScript skeleton with startup-time env validation (`NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `LOG_LEVEL`), but no way to run it in a container. SCRUM-29 (docker-compose full stack) and SCRUM-28 (Postgres service) depend on this image existing first.

## What Changes
- **Add `backend/Dockerfile`** — multi-stage build (`base` → `build` → `dev` / `production`) _(SCRUM-27)_
- **Add `backend/.dockerignore`** — excludes `node_modules`, `dist`, `.git`, `.env*`, logs _(SCRUM-27)_
- **Generate the Prisma client during image build** via `npx prisma generate`, so `dist/` and the generated client are both available before `tsc`/`node` run

### Non-goals
- No docker-compose wiring (SCRUM-29) or Postgres service definition (SCRUM-28) — this change only produces a buildable backend image
- No CI/CD pipeline integration (SCRUM-35)
- Does not attempt to run the container against a live database — `DATABASE_URL` etc. are required at runtime and validated by `env.ts`, but full functional verification happens once compose exists

## Capabilities

### New Capabilities
- `backend-containerization`: defines how the backend is packaged into a Docker image for local development and production, including the dev/production target split and required runtime environment contract

### Modified Capabilities
None

## Impact
**Created:** `backend/Dockerfile`, `backend/.dockerignore`
**Dependencies introduced:** none (uses existing `npm ci`, `prisma generate`, `tsc`, `tsx watch` already defined in `backend/package.json`)
**External systems:** Docker Hub base image `node:24-alpine`
**Downstream:** SCRUM-28 (Postgres service), SCRUM-29 (docker-compose full stack) build on top of this image
**Constraints carried from Jira:** acceptance criteria — Dockerfile exists; multi-stage build supports both dev and production targets; image builds successfully
