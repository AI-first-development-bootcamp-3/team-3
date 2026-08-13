## Context

The repository is empty — there is no `package.json`, no source tree, no CI. Every technical decision here is greenfield, and each one becomes a project-wide convention that four other epics will inherit. See `proposal.md` → Why for motivation.

Constraints shaping the approach:

- **One developer, one story.** SCRUM-11 is being implemented solo, so parallel-work merge contention is not a factor; reviewable, independently mergeable increments are.
- **Bootcamp timeline.** Time spent hand-rolling infrastructure is time not spent on the five feature epics that follow.
- **Free-tier deployment target.** SCRUM-35 targets Render/Railway/Fly free tiers, which impose small database quotas and — critically — ephemeral container filesystems.
- **Mandated by Jira tickets:** PostgreSQL, TypeScript, 60% test coverage, Swagger documentation, soft-delete over hard delete, traceable admin actions.
- **Hebrew-language domain data.** Employee-facing strings and seed data are Hebrew, so encoding and collation must be correct from the first migration.

## Goals / Non-Goals

**Goals:**

- Establish one conventional way to do each cross-cutting concern — erroring, validating, logging, authorizing, deleting — so feature epics compose rather than reinvent
- Make the type system, not developer discipline, the thing that keeps request schemas, database rows, and API docs in agreement
- Ship in seven independently reviewable increments, each merging to `task/SCRUM-11-backend` on its own
- Keep every environment-specific value in configuration so one artifact runs in dev, test, and production

**Non-Goals:**

- Performance optimisation. Correctness and clarity win; this is an internal timesheet tool with tens of users, not a high-throughput service.
- Abstraction over the database. Prisma is adopted directly — no repository layer wrapping it "in case we switch ORMs".
- Production-grade observability. Structured logs to stdout satisfy the audit-trail requirement; no metrics or tracing stack.
- Horizontal scalability. Single instance assumed.

## Decisions

### Monorepo with plain `backend/` and `frontend/` folders

SCRUM-3 requires "Dockerize front+back", meaning one `docker-compose.yml` must build both applications plus PostgreSQL. Compose needs both build contexts in the same repository; spanning two repos forces submodules or prebuilt images, both of which are heavy for this team. The organisation also provisioned exactly one repository per team, and frontend work (SCRUM-62, SCRUM-108) already needs somewhere to live.

*Alternatives:* **Backend at repository root** leaves the frontend homeless and breaks the shared compose file. **npm workspaces** would allow sharing TypeScript types across the boundary — genuinely attractive — but complicates Dockerfiles, which must then copy the root lockfile plus every workspace manifest before installing, and introduces hoisting failure modes that are miserable to debug under deadline. Plain folders keep each app self-contained with a five-line Dockerfile. The frontend can declare its own interfaces; duplication at this scale is cheap.

### Express over Fastify

Every middleware this change needs — helmet, multer, swagger-ui-express, cors — is Express-first, with Express examples in its own documentation. Express v5 is stable and now propagates async handler rejections to error middleware natively, removing the historical wrapper boilerplate.

*Alternative:* **Fastify** is roughly twice as fast with better native TypeScript types, and its built-in JSON-schema validation could have absorbed SCRUM-45 entirely. Rejected because throughput is irrelevant at this scale, and every supporting library would need its Fastify-specific plugin equivalent — real friction for no benefit the project can perceive.

### Prisma over Knex, TypeORM, and raw `pg`

The domain is deeply relational (Client → Project → Task → Report, plus user-task assignments) and the whole stack is TypeScript. Prisma generates its client from `schema.prisma`, so a column rename surfaces as a compile error rather than a runtime failure. It supplies SCRUM-44's migrations *and* seeding as first-class commands, and `prisma migrate reset` gives SCRUM-52 clean test-database state in one line. Relation traversal via `include` answers the cascading Client → Project → Task lookups that ticket explicitly calls for, in one typed query.

*Alternatives:* **TypeORM** has native soft-delete (`@DeleteDateColumn`), which is the one place it beats Prisma — but its migration generation is unreliable, decorators require `experimentalDecorators` plus `reflect-metadata`, and its typing is weaker. Trading Prisma's central strength for a feature reproducible in ~30 lines is a bad exchange. **Knex** is a query builder, not an ORM: every table needs a hand-maintained interface that can silently drift from the real schema. **Raw `pg`** means hand-rolling a migration runner and seed scripts before feature work can start; justified only if teaching SQL were the objective.

### Soft delete via Prisma Client Extension

Prisma has no native soft delete, so SCRUM-51's "shared query helper" is a Client Extension that rewrites `delete` into `update { isActive: false }` and injects `isActive: true` into reads unless a caller opts out. Written once, applied globally, invisible at call sites.

*Alternative:* filtering in each service function — rejected because a single forgotten `where` clause silently leaks deleted records, and nothing catches it.

### Zod for validation

The boundary problem is that network input arrives as `any` and must become trusted typed data. Joi and class-validator require declaring the shape twice — validator and TypeScript type — with nothing enforcing agreement, so they drift. Zod makes the schema authoritative and derives the static type from it via `z.infer`, making drift structurally impossible. `safeParse` returns structured issues that map directly onto the error contract from `api-skeleton`, cross-field rules like SCRUM-125's end-time-after-start-time are expressible with `.refine()`, and `zod-to-openapi` can later generate SCRUM-50's Swagger schemas from the same objects — one source of truth spanning validation, types, and docs.

*Alternatives:* **Joi** is mature with an excellent API but predates TS-first design and infers nothing. **class-validator** suits NestJS DTO classes; on plain Express it needs `reflect-metadata`, forces `plainToInstance` before validating, and pairs awkwardly with Prisma's plain generated types.

### Vitest over Jest

Native TypeScript and ESM execution with no transform configuration. Jest needs `ts-jest` or Babel wiring whose ESM interop breaks in exactly the situation this project creates — a generated Prisma client imported across test files. Vitest's API is Jest-compatible, so existing knowledge transfers, and `v8` coverage is built in for the 60% gate.

*Alternative:* **Jest** has more examples and wider familiarity. Rejected because the configuration friction is real and recurring, while the API difference is nearly nil.

### pino for logging

Structured JSON by default, which is what makes SCRUM-47's audit trail queryable rather than grep-able, and `pino-http` supplies per-request logging with correlation IDs out of the box. `pino-pretty` handles human-readable local output.

*Alternative:* **winston** is more configurable with more transports; that flexibility is unused here, and it is measurably slower.

### File bytes outside PostgreSQL

Attachments are sick notes and reserve-duty confirmations — PDFs and phone photos at 1–5 MB. Storing them as `bytea` would bloat every `pg_dump`, defeat streaming (PostgreSQL loads the whole value into memory, then Node's heap, then the response), consume the ~1 GB free-tier database quota that should hold years of report rows, and bypass HTTP caching. So: metadata row in PostgreSQL (`filename`, `mimeType`, `sizeBytes`, `storageKey`, `uploadedAt`) with bytes behind a `FileStorage` interface, implemented for the local filesystem now.

*Alternatives:* **`bytea` in PostgreSQL** is defensible for small, low-volume files such as avatars — attachments are neither. **S3-compatible from day one** is where this ends up in production but adds a service, SDK, and credentials before anything actually uploads; the interface makes that a later implementation rather than a refactor.

### Layered structure: route → controller → service → Prisma

Routes declare paths and compose middleware; controllers translate HTTP to and from domain calls; services hold business logic and own all database access. Feature epics gain an obvious place to put things, and services stay unit-testable without HTTP.

*Alternative:* logic in route handlers is faster for the first endpoint and unsustainable by the twentieth, with business rules untestable except through HTTP.

### Seven feature branches off the task branch

Given a single developer, branch granularity optimises for reviewable history, not merge contention. Each feature is a coherent, independently mergeable unit rather than a 1:1 mirror of the 14 Jira subtasks — several subtasks only make sense reviewed together.

```
development
└── epic-setup&instrafracture              (epic SCRUM-3)
    └── task/SCRUM-11-backend              (task SCRUM-11)
        ├── feat/SCRUM-23-app-skeleton     (23, 21, 24, 25)
        ├── feat/SCRUM-22-data-layer       (22, 44, 51)
        ├── feat/SCRUM-45-request-pipeline (45, 47, 48)
        ├── feat/SCRUM-46-auth-middleware  (46)
        ├── feat/SCRUM-52-test-harness     (52)
        ├── feat/SCRUM-50-api-docs         (50)
        └── feat/SCRUM-49-file-uploads     (49)
```

Two deliberate groupings: **SCRUM-25 (unit test setup) moves into the skeleton** so the very first pull request ships with a passing test and a CI-able command, rather than bolting testing on afterwards; and **SCRUM-52 (test database) stays separate** because it cannot exist before the data layer does. Branches are named for their lead subtask, with the remaining keys referenced in commit messages so Jira links them all.

*Alternatives:* **one branch for everything** produces a single unreviewable diff. **One branch per subtask** yields 14 pull requests for one day's work, several of which are individually meaningless — ESLint configuration is not a reviewable unit apart from the project it lints.

## Risks / Trade-offs

**Free-tier filesystems are ephemeral → uploaded files vanish on redeploy.** Render and Railway free tiers do not persist container disks. Mitigation: the `FileStorage` interface makes swapping in S3-compatible storage (Cloudflare R2 and Backblaze B2 both have real free tiers) a new implementation, not a refactor. Recorded explicitly so it is not discovered during a demo.

**Prisma's generated client can desynchronise from the schema.** Editing `schema.prisma` without regenerating produces confusing type errors. Mitigation: `postinstall` runs `prisma generate`, and the migrate script regenerates as part of the same command.

**Soft-delete extension is invisible at call sites.** A developer reading a service function will not see the injected `isActive: true` filter and may be surprised when a record "disappears". Mitigation: documented in the backend README, plus a test asserting the default filter and the explicit opt-out both behave as specified.

**Test database reset strategy trades speed for isolation.** Truncating tables between tests is slower than transaction rollback but tolerates code that manages its own transactions. Mitigation: start with truncation for correctness; revisit only if suite runtime becomes an obstacle.

**Long-lived `task/SCRUM-11-backend` drifts from `development`.** Other epics merge to `development` while this branch is open. Mitigation: merge `development` into the task branch at each feature boundary — seven natural sync points — rather than one painful reconciliation at the end.

**The error contract is set before any real endpoint exists.** Feature work may reveal the shape is wrong. Mitigation: keep it minimal — `code`, `message`, optional `details` — so extension is additive; and land it in the first feature so problems surface early rather than after twenty endpoints depend on it.

**Hebrew data requires correct encoding end to end.** Mitigation: PostgreSQL initialised with UTF-8; seed data includes Hebrew strings specifically so the first migration proves the path.

## Migration Plan

No migration — greenfield. Delivery sequence, with each feature merged to `task/SCRUM-11-backend` before the next begins:

1. **`feat/SCRUM-23-app-skeleton`** — nothing else can exist first. Establishes `package.json`, TypeScript config, folder layout, `/health`, the error contract, lint, and the test runner. Install the full dependency set here so later branches add only source files.
2. **`feat/SCRUM-22-data-layer`** — PostgreSQL in Docker, Prisma schema, first migration, seed, soft-delete extension.
3. **`feat/SCRUM-45-request-pipeline`** — validation, logging, CORS, helmet.
4. **`feat/SCRUM-46-auth-middleware`** — JWT verification and role guard, depending on the error contract from (1) and validation from (3).
5. **`feat/SCRUM-52-test-harness`** — test database and reset, requiring both (1) and (2).
6. **`feat/SCRUM-50-api-docs`** — Swagger, documenting `/health` as the worked example.
7. **`feat/SCRUM-49-file-uploads`** — deferrable; nothing consumes it until the היעדרויות epic.

Steps 6 and 7 may be dropped from this change and moved to their consuming epics without affecting steps 1–5. Rollback at any point is discarding the unmerged feature branch; `task/SCRUM-11-backend` only ever holds completed features.

## Open Questions

- **Deployment platform** (SCRUM-35: Render vs Railway vs Fly) is undecided. It does not affect this change — it determines only which persistent-storage option replaces the local file store later.
- **JWT signing secret management** in production. This change reads the secret from the environment; how it is provisioned belongs to the CD task.
- **Access-token lifetime and whether refresh tokens are used** belongs to the Auth epic (SCRUM-4). This change verifies whatever tokens that epic issues; SCRUM-197 (server-side invalidation) may later require a token store, which the verification middleware can accommodate additively.
- **The project spec document** referenced by several Jira tickets was not available. Constraints extracted from ticket text are captured above; if that document adds requirements, the specs may need revision.
