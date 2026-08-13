# CI/CD

Tracks Jira epic [SCRUM-13](https://dangutman98-1786525083697.atlassian.net/browse/SCRUM-13). This note covers the CI half only (branch `task-ci/cd-ci`, off `task-ci/cd`, off `epic-setup-infrasracture`); CD is deferred to `task-ci/cd-cd` until a deploy platform is chosen.

## Workflow — `.github/workflows/ci.yml`

Runs on every PR and on push to `main`:

| Job | Subtask | What it does |
|---|---|---|
| `lint` | SCRUM-31 (lint half) | `npm ci` + `npm run lint` for `frontend/` and `backend/` |
| `test-frontend` | SCRUM-31 (frontend tests) | `npm ci` + `npm run test` for `frontend/` — jsdom, no external services |
| `test-backend` | SCRUM-31 (backend tests) + SCRUM-55 | `npm ci` + `npm run test` for `backend/`, against a real `postgres:16-alpine` service container |
| `build` | SCRUM-32 | `npm run build` for both apps |
| `docker-build` | SCRUM-54 | Builds `frontend/Dockerfile` and `backend/Dockerfile` (build only, no push), with GHA layer caching |

**Why `test-backend` covers both SCRUM-31 and SCRUM-55:** `backend/vitest.config.ts` wires a `globalSetup` (`src/test/globalSetup.ts`) that runs `prisma migrate deploy` against a real Postgres database (`abra_test`) before every test file, unconditionally — this repo has no separate "unit" vs "integration" test suite. So there's no meaningful difference between "run backend's tests" (SCRUM-31) and "run backend's tests against a real Postgres service container" (SCRUM-55) — they're the same `npm run test` command. Splitting them into two jobs would just run the identical suite twice against two throwaway databases. Connection details (`DATABASE_URL`, `JWT_SECRET`, etc.) come from `backend/src/test/testEnv.ts`, not from anything set in the workflow — no credentials live in this repo or in CI config.

## Branch protection on `main` (SCRUM-33)

Configured in GitHub repo Settings → Branches (not expressible as a committed file):

- No direct pushes to `main` — all changes via PR
- PR required before merging
- Required status checks: `lint`, `test-frontend`, `test-backend`, `build`, `docker-build`
- At least 1 approving review required

Apply these settings once this branch's workflow is merged and has run at least once (GitHub only lists a check as selectable for "required" after it has appeared in a run).
