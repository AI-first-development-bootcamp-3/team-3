# team-3

Time reporting system (מערכת דיווחי שעות) — Abra AI-first bootcamp, team 3.

## Git workflow

- **`development`** is the integration branch. All work lands here first.
- **`main`** is updated only by merging `development`.
- Cut a branch from `development`: `feat/SCRUM-<id>-short-name` (or `fix/` / `chore/`).
- Open a PR **into `development`**. Do not target `main`, epics, or leftover task branches.
- The only PR allowed into `main` is `development` → `main`.
- Delete the feature branch after it is merged.

## Local run

See [DOCKER.md](DOCKER.md).
