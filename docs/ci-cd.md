# CI/CD

Tracks Jira epic [SCRUM-13](https://dangutman98-1786525083697.atlassian.net/browse/SCRUM-13). This note covers the CI half only (branch `task-ci/cd-ci`); CD is deferred to `task-ci/cd-cd` until a deploy platform is chosen and [SCRUM-52](https://dangutman98-1786525083697.atlassian.net/browse/SCRUM-52) lands.

## Workflow — `.github/workflows/ci.yml`

Runs on every PR and on push to `main`:

| Job | Subtask | What it does |
|---|---|---|
| `lint-test` | SCRUM-31 | `npm ci`, `npm run lint`, `npm run test` for `frontend/` and `backend/` |
| `build` | SCRUM-32 | `npm run build` for both apps |
| `docker-build` | SCRUM-54 | Builds `frontend/Dockerfile` and `backend/Dockerfile` (build only, no push), with GHA layer caching |
| `integration-test` | SCRUM-55 | Backend tests against a real `postgres:16-alpine` service container, migrated with `prisma migrate deploy` |

`integration-test` is a best-effort implementation: [SCRUM-52](https://dangutman98-1786525083697.atlassian.net/browse/SCRUM-52) (test DB config for integration tests) was still **In Progress** when this workflow was written, so there's no dedicated integration-test script yet — the job runs the full `backend` `npm run test` suite against the service container. Revisit this job once SCRUM-52 defines real conventions (e.g. a `test:integration` script that separates unit from DB-touching tests).

## Branch protection on `main` (SCRUM-33)

Configured in GitHub repo Settings → Branches (not expressible as a committed file):

- No direct pushes to `main` — all changes via PR
- PR required before merging
- Required status checks: `lint-test`, `build`, `docker-build` (and `integration-test` once SCRUM-52 lands)
- At least 1 approving review required

Apply these settings once this branch's workflow is merged and has run at least once (GitHub only lists a check as selectable for "required" after it has appeared in a run).
