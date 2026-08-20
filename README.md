# Abra Timesheet — מערכת דיווחי שעות

A Hebrew, right-to-left time-reporting system for Abra: employees log hours (manually
or with a live work clock), report absences, and attach documents; admins manage the
client/project/task catalog, assign work, review and adjust employee reports, and lock
months once payroll is closed.

Built during the Abra AI-first bootcamp by team 3.

**Live site: [https://team-3-ig91.onrender.com/](https://team-3-ig91.onrender.com/)**

---

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Ant Design 6 (RTL), React Router 7, TanStack Query, Zustand, React Hook Form + Zod, Day.js |
| Backend | Node 24, Express 5, TypeScript (ESM), Prisma 7, Zod, JWT (`jsonwebtoken`) + bcrypt, Pino, Helmet, `express-rate-limit`, Multer, Swagger (`swagger-jsdoc` / `swagger-ui-express`) |
| Database | PostgreSQL 16 (Prisma migrations + seed) |
| Storage | Supabase Storage in deployed envs, local filesystem fallback for dev |
| Testing | Vitest on both sides; Testing Library + jsdom (frontend), Supertest (backend) |
| Tooling | ESLint 9/10, Prettier, Docker Compose, GitHub Actions (CI + CD to Render) |
| Domain | `@hebcal/core` for Israeli holidays and working-day calculations |

---

## Project structure

```
.
├── backend/                  # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma     # User, Client, Project, Task, TaskAssignment,
│   │   │                     # Absence, Attachment, TimeReport, MonthLock,
│   │   │                     # WorkClockSession, LoginAttempt, TimeReportAudit, …
│   │   ├── migrations/
│   │   └── seed.ts           # demo users + NVIDIA/Intel/AMD/HP/Amazon catalog
│   └── src/
│       ├── app.ts            # Express app (no listen) — imported by tests
│       ├── server.ts         # process entrypoint
│       ├── config/           # env parsing, logger, prisma, multer, swagger
│       ├── routes/           # thin routers, one per resource
│       ├── controllers/      # request/response shaping
│       ├── services/         # business logic (reports, absences, work clock,
│       │                     # month locks, holidays, storage adapters, rate limits)
│       ├── middleware/       # auth, validation, rate limiting, logging, errors
│       ├── jobs/             # e.g. end-of-day work-clock cleanup
│       └── test/             # shared test helpers
│
├── frontend/                 # React SPA (Vite)
│   └── src/
│       ├── routes.tsx        # router + RequireAuth / RequireRole / RequireGuest guards
│       ├── pages/            # Login, ChangePassword, Reports, admin/*
│       ├── components/       # forms, admin shell, tables, header
│       ├── services/         # API client, auth, session store, per-resource clients
│       ├── hooks/            # useWorkClock, useHealthCheck
│       └── types/
│
├── docker/                   # Compose-related assets
├── docker-compose.yml        # frontend + backend + postgres
├── docs/ci-cd.md             # pipeline documentation
├── DOCKER.md                 # local Docker workflow
└── SUPABASE_QUICKSTART.md / SUPABASE_DEPLOYMENT.md
```

---

## What's inside

**Employee**
- Login with email + password, forced password change on first login, logout, session persistence.
- Monthly report view with per-day breakdown, status filtering, and KPI summary.
- Manual hour reporting against assigned client/project/task, plus batch report writes.
- Live work clock — start / stop / complete / discard, with an end-of-day job that cleans up sessions left running.
- Absence reporting (with conflict detection against existing reports) and file attachments.
- Israeli holiday and working-day awareness via `@hebcal/core`.

**Admin**
- Users: create, role changes, activate/deactivate, password reset.
- Catalog: clients, projects, tasks, and task assignments per employee.
- Employee reports: review, adjust, and batch actions, with a full audit trail (`TimeReportAudit`).
- Hour settings and month locks — once a month is locked, employee writes into it are rejected.

**Platform**
- Zod-validated env parsing that fails fast and reports *every* problem at startup.
- Rate limiting on failed logins (per email and per IP) and on authenticated write traffic.
- Helmet, CORS allowlist, structured Pino request logging.
- Swagger UI at `/api-docs` (and `/api-docs.json`) in development.
- Soft deletes on records that must stay auditable.

---

## How to run

### Option A — Docker Compose (everything at once)

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Swagger | http://localhost:3000/api-docs |
| Postgres | localhost:5432 |

More detail — rebuilds, log tailing, wiping the volume — in [DOCKER.md](DOCKER.md).

### Option B — Local Node, Postgres in Docker

Prerequisites: Node 24+, Docker.

```bash
cp .env.example .env
docker compose up -d postgres
```

Backend:

```bash
cd backend && npm install && npx prisma migrate deploy && npm run seed && npm run dev
```

Frontend (second terminal):

```bash
cd frontend && npm install && npm run dev
```

Verify the API is up:

```bash
curl http://localhost:3000/health
```

### Seeded demo accounts

`npm run seed` creates 7 demo users — `admin@abra.test`, `employee@abra.test`,
`gal@abra.test`, … — all with password `password123`, plus a demo client/project/task
catalog. The seed is repeatable (upserts on stable keys).

---

## Environment variables

Copy `.env.example` to `.env`; it is annotated and matches the Compose defaults.
Key values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (inside Compose the host is `postgres`, not `localhost`) |
| `JWT_SECRET` | Signing secret, 32+ chars. The committed value is dev-only |
| `CORS_ORIGIN` | Allowed frontend origin |
| `VITE_API_URL` | Backend URL the **browser** calls — must be host-reachable |
| `RATE_LIMIT_*` | Failed-login and write throttles |
| `TRUST_PROXY` | Leave `false` unless a real proxy sits in front of the API |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` | Attachment storage — see [SUPABASE_QUICKSTART.md](SUPABASE_QUICKSTART.md) |

---

## Scripts

Backend (`cd backend`):

| Script | Purpose |
| --- | --- |
| `npm run dev` | Hot-reloading server (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run seed` | Populate the database |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run test:coverage` | Vitest with the 60% line-coverage gate |
| `npm run typecheck` / `lint` / `format` | `tsc --noEmit`, ESLint, Prettier |

Frontend (`cd frontend`):

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` / `npm run preview` | Typecheck + production build, then serve it |
| `npm test` | Vitest + Testing Library |
| `npm run lint` / `npm run format` | ESLint, Prettier |

---

## API surface

All routes are documented in Swagger; the shape at a glance:

| Area | Routes |
| --- | --- |
| Auth | `POST /login`, `POST /logout`, `GET /me`, `PUT /me/password` |
| Reporting | `/reports`, `/reports/batch`, `/me/reporting-options` |
| Work clock | `/me/clock/session`, `/me/clock/start`, `/me/clock/stop`, `/me/clock/complete`, `/me/clock/discard` |
| Absences | `/absences`, `/absences/:id` |
| Attachments | `/attachments`, `/attachments/:id` |
| Calendar | `/holidays` |
| Admin | `/admin/users`, `/admin/clients`, `/admin/projects`, `/admin/tasks`, `/admin/assignments`, `/admin/month-locks`, `/admin/reports` (+ `/batch`, `/audit`, `/options`) |
| Ops | `GET /health` |

---

## Testing

```bash
cd backend  && npm test
cd frontend && npm test
```

Backend tests run against a real test database (see `backend/README.md` for the
test-database setup); they exercise `app.ts` directly through Supertest rather than
binding a port. Frontend tests use Testing Library on jsdom.

Note: tests are the specification here — if one fails, fix the code, not the test.

---

## CI / CD

- **CI** (`.github/workflows/ci.yml`) — on every push/PR: `npm ci`, lint, build, test for both `backend` and `frontend`.
- **CD** (`.github/workflows/cd.yml`) — after a green CI run: `prisma migrate deploy`, then triggers and polls Render deploys for backend and frontend, finishing with a smoke check against each. The frontend lands at [https://team-3-ig91.onrender.com/](https://team-3-ig91.onrender.com/).

Details in [docs/ci-cd.md](docs/ci-cd.md).

---

## Libraries

Every runtime and tooling dependency, and why it is here.

### Frontend — runtime

| Library | Version | Why |
| --- | --- | --- |
| `react` / `react-dom` | 19.2 | UI runtime |
| `react-router-dom` | 7.18 | Client-side routing and the route guards |
| `antd` | 6.6 | Component library, used in RTL mode for the Hebrew UI |
| `@tanstack/react-query` | 5.101 | Server-state: fetching, caching, invalidation |
| `zustand` | 5.0 | Client-state (session store) |
| `react-hook-form` | 7.85 | Form state and validation wiring |
| `@hookform/resolvers` | 5.7 | Bridges Zod schemas into React Hook Form |
| `zod` | 4.4 | Schema validation, shared shape with the backend |
| `dayjs` | 1.11 | Dates, month grids, Ant Design's date adapter |

### Frontend — tooling

| Library | Version | Why |
| --- | --- | --- |
| `vite` + `@vitejs/plugin-react` | 8.2 / 6.0 | Dev server and production build |
| `typescript` | 6.0 | Types |
| `vitest` | 4.1 | Test runner |
| `jsdom` | 28.1 | DOM environment for tests |
| `@testing-library/react` / `dom` / `user-event` / `jest-dom` | — | Component tests and assertions |
| `eslint`, `typescript-eslint`, `@eslint/js`, `globals` | — | Linting |
| `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | — | React-specific lint rules |
| `prettier`, `eslint-config-prettier` | — | Formatting, without fighting ESLint |

### Backend — runtime

| Library | Version | Why |
| --- | --- | --- |
| `express` | 5.2 | HTTP framework |
| `@prisma/client` + `@prisma/adapter-pg` + `pg` | 7.9 / 8.16 | ORM, migrations, and the Postgres driver |
| `zod` | 4.4 | Request-body and env-var validation |
| `jsonwebtoken` | 9.0 | Signing and verifying auth tokens |
| `bcryptjs` | 3.0 | Password hashing |
| `helmet` | 8.3 | Security headers |
| `cors` | 2.8 | Origin allowlist |
| `express-rate-limit` | 8.6 | Failed-login and write throttles |
| `multer` | 2.2 | Multipart uploads for attachments |
| `@supabase/supabase-js` | 2.112 | Attachment storage in deployed environments |
| `pino` + `pino-http` | 10.3 / 11.0 | Structured request and application logging |
| `swagger-jsdoc` + `swagger-ui-express` | 6.3 / 5.0 | OpenAPI spec from JSDoc, served at `/api-docs` |
| `@hebcal/core` | 6.9 | Israeli holidays and working-day calculations |
| `dotenv` | 17.4 | Loads `.env` in development |

### Backend — tooling

| Library | Version | Why |
| --- | --- | --- |
| `prisma` | 7.9 | CLI: migrations, `generate`, seeding |
| `tsx` | 4.23 | Hot-reloading TypeScript execution in dev |
| `typescript` | 6.0 | Types and the `dist/` build |
| `vitest` + `@vitest/coverage-v8` | 4.1 | Test runner and the 60% coverage gate |
| `supertest` | 7.2 | Drives `app.ts` in tests without binding a port |
| `@apidevtools/swagger-parser` | 12.1 | Validates the generated OpenAPI spec in tests |
| `pino-pretty` | 13.1 | Readable dev logs |
| `eslint`, `typescript-eslint`, `@eslint/js`, `globals` | — | Linting |
| `prettier`, `eslint-config-prettier` | — | Formatting |
| `@types/*` | — | Type definitions for cors, express, jsonwebtoken, multer, node, pg, supertest, swagger |

---

## Git workflow

- **`development`** is the integration branch. All work lands here first.
- **`main`** is updated only by merging `development`.
- Cut a branch from `development`: `feat/SCRUM-<id>-short-name` (or `fix/` / `chore/`). The `SCRUM-<id>` prefix is a historical label from the retired Jira board.
- Open a PR **into `development`**. Do not target `main` or leftover task branches.
- The only PR allowed into `main` is `development` → `main`.
- Delete the feature branch after it is merged.

---

## Further reading

- [DOCKER.md](DOCKER.md) — local Docker workflow
- [backend/README.md](backend/README.md) — API setup, env vars, test database
- [SUPABASE_QUICKSTART.md](SUPABASE_QUICKSTART.md) / [SUPABASE_DEPLOYMENT.md](SUPABASE_DEPLOYMENT.md) — attachment storage
- [docs/ci-cd.md](docs/ci-cd.md) — pipeline
