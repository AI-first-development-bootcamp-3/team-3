## 1. Feature: Full-stack Docker Compose — `subtask/SCRUM-29-docker-compose-full-stack`

_Covers SCRUM-29. Depends on SCRUM-26 (frontend Dockerfile), SCRUM-27 (backend Dockerfile), SCRUM-28 (Postgres service, already on this branch)._

- [x] 1.1 Confirm the Postgres service is already present on this branch (inherited from SCRUM-28)
- [ ] 1.2 Add `backend` service to `docker-compose.yml` (`dev` target, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `depends_on: postgres` healthy)
- [ ] 1.3 Add `frontend` service to `docker-compose.yml` (`dev` target, `VITE_API_URL`, `depends_on: backend`)
- [ ] 1.4 Add explicit shared `app-network` to all three services
- [ ] 1.5 Merge in `frontend/` and `backend/` source (SCRUM-26/27) so the compose file can actually build
- [ ] 1.6 Verify `docker compose up` succeeds and services can reach each other
- [ ] 1.7 Commit and push
- [ ] 1.8 Transition SCRUM-29 to Done in Jira and run `/opsx:archive` once merged
