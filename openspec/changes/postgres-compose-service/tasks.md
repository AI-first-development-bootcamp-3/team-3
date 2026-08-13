## 1. Feature: PostgreSQL Compose Service — `Subtask/scrum-28-PostgreSQL-service`

_Covers SCRUM-28. Reuses the Postgres service already defined on `feat/SCRUM-22-data-layer`._

- [x] 1.1 Locate existing Postgres service definitions across branches (`task/SCRUM-11-backend`, `feat/SCRUM-22-data-layer`) to avoid divergence
- [x] 1.2 Add root `docker-compose.yml` with the `postgres` service (image, env vars, volume, port, healthcheck)
- [ ] 1.3 Verify `docker compose up postgres` starts and the healthcheck passes
- [x] 1.4 Commit and push `Subtask/scrum-28-PostgreSQL-service`
- [ ] 1.5 Transition SCRUM-28 to Done in Jira and run `/opsx:archive` once merged
