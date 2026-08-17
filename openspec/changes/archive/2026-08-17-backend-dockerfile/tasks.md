## 1. Feature: Backend Dockerfile — `subtask/SCRUM-27-backend-dockerfile`

_Covers SCRUM-27. Depends on `backend-foundation` (SCRUM-11) for the app skeleton this image packages._

- [x] 1.1 Inspect `backend-foundation` skeleton (stack, scripts, env contract) on `origin/task/SCRUM-11-backend`
- [x] 1.2 Add `backend/Dockerfile` with `base` / `build` / `dev` / `production` stages
- [x] 1.3 Add `backend/.dockerignore`
- [ ] 1.4 Verify `docker build --target production` succeeds
- [ ] 1.5 Verify `docker build --target dev` succeeds
- [x] 1.6 Commit and push `subtask/SCRUM-27-backend-dockerfile`
- [ ] 1.7 Transition SCRUM-27 to Done in Jira and run `/opsx:archive` once merged
