## 1. Feature: Env + Docker run docs — `subtask/SCRUM-30-Env-+-docs-for-local-Docker-run`

_Covers SCRUM-30. Documents the environment contract and run instructions for the stack wired in SCRUM-29._

- [x] 1.1 Add root `.env.example` matching SCRUM-29's current compose values
- [x] 1.2 Add `DOCKER.md` with prerequisites, first-run steps, ports table, rebuild/teardown commands
- [x] 1.3 Update `docker-compose.yml` to read values via `${VAR:-default}` substitution — done on `task-Docker`, where `docker-compose.yml` now exists (merged from SCRUM-29)
- [ ] 1.4 Verify `cp .env.example .env && docker compose up --build` works end-to-end — blocked, Docker isn't available in this environment
- [ ] 1.5 Commit and push
- [ ] 1.6 Transition SCRUM-30 to Done in Jira and run `/opsx:archive` once merged
