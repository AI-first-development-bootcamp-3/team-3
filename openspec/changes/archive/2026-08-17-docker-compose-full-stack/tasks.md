## 1. Feature: Full-stack Docker Compose — `subtask/SCRUM-29-docker-compose-full-stack`

_Covers SCRUM-29. Depends on SCRUM-26 (frontend Dockerfile), SCRUM-27 (backend Dockerfile), SCRUM-28 (Postgres service, already on this branch)._

- [x] 1.1 Confirm the Postgres service is already present on this branch (inherited from SCRUM-28)
- [x] 1.2 Add `backend` service to `docker-compose.yml` (`dev` target, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `depends_on: postgres` healthy)
- [x] 1.3 Add `frontend` service to `docker-compose.yml` (`dev` target, `VITE_API_URL`, `depends_on: backend`)
- [x] 1.4 Add explicit shared `app-network` to all three services
- [x] 1.5a Add `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore` to this branch (infrastructure only, matching SCRUM-26/27 verbatim) so the compose build contexts resolve
- [ ] 1.5b Merge in the actual `frontend/` and `backend/` application source (from `origin/task-frontend` and `origin/feat/SCRUM-22-data-layer` / `origin/task/SCRUM-11-backend`) — deferred; user will add/integrate this later
- [ ] 1.6 Verify `docker compose up` succeeds and services can reach each other — blocked until 1.5b, and Docker isn't available in this environment regardless
- [ ] 1.7 Commit and push
- [ ] 1.8 Transition SCRUM-29 to Done in Jira and run `/opsx:archive` once merged
