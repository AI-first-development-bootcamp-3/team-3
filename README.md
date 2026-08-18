# team-3

Time reporting system (מערכת דיווחי שעות) — Abra AI-first bootcamp, team 3.

## Git workflow

- **`development`** is the integration branch. All work lands here first.
- **`main`** is updated only by merging `development`.
- Cut a branch from `development`: `feat/SCRUM-<id>-short-name` (or `fix/` / `chore/`).
- Open a PR **into `development`**. Do not target `main`, epics, or leftover task branches.
- The only PR allowed into `main` is `development` → `main`.
- Delete the feature branch after it is merged.

### Epic branches (exception)

A large epic may get a short-lived integration branch named `epic-<name>`,
cut from `development`, when its stories/tasks are too interdependent to
land in `development` one at a time. This is the only case where a PR
targets something other than `development`:

- Cut `epic-<name>` from `development`.
- Cut each `feat/SCRUM-<id>-short-name` branch from `epic-<name>`, and PR
  each one **into `epic-<name>`**.
- When every branch under the epic is merged, one final PR merges
  `epic-<name>` → `development`.
- Delete the epic branch (and its feature branches) after that merge.

Current example: `epic-admin` (SCRUM-5).

## Local run

See [DOCKER.md](DOCKER.md).

## Hosting

Production is Railway, deployed from `main`. Setup: [RAILWAY.md](RAILWAY.md).
