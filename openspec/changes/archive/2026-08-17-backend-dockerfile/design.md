## Context
- Backend is TypeScript/ESM, Node >=24, Express 5, Prisma 7.9 ORM, npm with `.npmrc` `save-exact=true` (`npm ci` is the intended install path)
- `env.ts` validates `NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `LOG_LEVEL` at process startup via zod, and exits the process if any are missing/invalid — these are runtime inputs, not build-time
- Companion frontend Dockerfile (SCRUM-26, branch `subtask/SCRUM-26-frontend-dockerfile`) already established a `build` / `dev` / `production` multi-stage pattern selectable via `--target`; this change mirrors that shape for consistency across the two services

## Goals / Non-Goals
**Goals:**
- One Dockerfile, multiple targets: `dev` (hot reload via `tsx watch`) and `production` (compiled `dist/` + `node`)
- Prisma client generated at image-build time so neither target needs the `prisma` CLI available at container start
- Image builds successfully in isolation (`docker build`), independent of a live database

**Non-Goals:**
- Runtime correctness against a real Postgres instance (deferred to SCRUM-28/29)
- Minimizing final image size beyond a reasonable default (alpine base, no further slimming)

## Decisions
### Copy full `node_modules` from `build` stage into `production`, rather than re-running `npm ci --omit=dev`
Re-installing production-only dependencies in the final stage would drop the `prisma` devDependency, and the generated Prisma client's correctness depends on `prisma generate` having run with the CLI present. Copying the already-built `node_modules` (including the generated client) from `build` avoids a second, unreliable generate-without-CLI step.
*Alternatives:* **`npm ci --omit=dev` + re-run `prisma generate` in production stage** — rejected: requires installing `prisma` as a production dependency just for image build, contaminating the dependency tree. **`npm prune --omit=dev` after generate** — viable smaller-image alternative, deferred as an optimization, not required for the acceptance criteria.

## Risks / Trade-offs
**Production image is larger than a fully pruned equivalent.** Full `node_modules` (including devDependencies) is copied into the production stage. Mitigation: acceptable for now since acceptance criteria only require a successful build; `npm prune` can be added later without changing the Dockerfile's external shape.

**Cannot verify runtime behavior in this change.** The image requires `DATABASE_URL` pointing at a live Postgres to start successfully; without SCRUM-28/29, `docker run` will fail fast on env validation. Mitigation: acceptance criteria for SCRUM-27 only require `docker build` to succeed, not `docker run`; full runtime verification is explicitly deferred to the compose subtasks.

## Migration Plan
1. Add `backend/Dockerfile` and `backend/.dockerignore` on `subtask/SCRUM-27-backend-dockerfile`
2. Verify `docker build --target production` and `--target dev` both succeed (once backend source is available on this branch or merged in)
3. Hand off to SCRUM-28 (Postgres compose service) and SCRUM-29 (full-stack compose) to wire this image into a runnable stack

## Open Questions
- **Should `backend/` source be merged onto this branch before writing the Dockerfile**, so `docker build` can actually be verified now rather than deferred? (Same open question as SCRUM-26; previously resolved as "write unverified, verify later.")
