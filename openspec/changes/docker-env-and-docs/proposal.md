## Why
SCRUM-29 wired frontend, backend, and Postgres into `docker-compose.yml`, but every connection detail (credentials, ports, secrets) is hardcoded inline rather than externalized, and there's no written guidance for a contributor on how to actually run the stack. SCRUM-30 closes that gap with a `.env.example` and short run notes. Per Jira, this is deliberately narrow — the full project README stays in a separate Documentation epic.

## What Changes
- **Add root `.env.example`** documenting every var the Compose stack needs (Postgres user/password/db/port, backend port/CORS origin/JWT secret/log level/database URL, frontend API URL), matching SCRUM-29's current hardcoded values exactly _(SCRUM-30)_
- **Add `DOCKER.md`** — short run notes: prerequisites, first run (`docker compose up --build`), a ports table, and common commands (rebuild a single service, tear down, reset the data volume) _(SCRUM-30)_
- **Design note, not delivered on this branch**: `docker-compose.yml` should eventually be updated to read these values via `${VAR:-default}` substitution instead of hardcoding them, so `.env` actually takes effect — deferred since this branch doesn't have `docker-compose.yml` yet (SCRUM-29 isn't merged in here)

### Non-goals
- Not the full project README — explicitly out of scope per Jira, belongs to the Documentation epic
- Not modifying `docker-compose.yml` directly on this branch — it doesn't exist here yet (this branch was cut from `main`, not from SCRUM-29's branch)
- No production/deployment env docs — local dev only

## Capabilities

### New Capabilities
- `local-docker-docs`: defines the documented environment contract and run instructions for operating the Dockerized stack locally

### Modified Capabilities
None

## Impact
**Created:** `.env.example`, `DOCKER.md`
**Depends on:** `docker-compose.yml` (SCRUM-29) — not present on this branch yet
**Downstream:** none further — last subtask under SCRUM-12 (Docker)
**Constraints carried from Jira:** acceptance criteria — `.env.example` for Compose exists; short run notes cover `docker compose up`, ports, and rebuild; explicitly not the full README
