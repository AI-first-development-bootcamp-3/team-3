## Context

See `proposal.md`. Home shell exists (`frontend-employee-home`); manual multi-row reporting exists (`time-reports`). **הפעלת שעון** is intentionally disabled today. SCRUM-305 enables the PRD timer fast path without replacing **דיווח ידני**.

Product decisions (user Q&A, Aug 2026) are captured in the specs; this document covers technical shape.

## Goals / Non-Goals

**Goals:**

- One authoritative **active clock session per user** on the server
- Client shows live HH:MM:SS from server `startedAt` (hybrid: server truth, client ticker)
- Stop → centered RTL modal with same stepped sheets as manual entry (project → task → location)
- Confirm creates report(s) through existing write APIs; cancel discards with no row
- Resume after refresh/logout/re-login; tabs stay in sync via polling or refetch on focus
- EOD cron auto-stops open sessions; user completes confirm modal on next visit

**Non-Goals:**

- Pause, admin views, report source tagging, push notifications for auto-stop

## Decisions

### 1. Session model (Postgres)

New `WorkClockSession` (name TBD in Prisma):

| Field | Notes |
| --- | --- |
| `id`, `userId` | Owner |
| `startedAt` | UTC timestamp |
| `stoppedAt` | Set on stop or EOD auto-stop; null while active |
| `status` | `ACTIVE` \| `AWAITING_CONFIRM` \| `DISCARDED` |
| `autoStopped` | boolean — true when EOD job ended it |

**Why server session:** refresh resume, multi-tab sync, EOD auto-stop, month-lock checks at start/stop.

**Alternative rejected:** client-only timer — cannot enforce single active session or EOD reliably.

### 2. API surface

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/me/clock/session` | Active session or `AWAITING_CONFIRM` draft payload |
| `POST` | `/me/clock/start` | Create `ACTIVE` session |
| `POST` | `/me/clock/stop` | End session → `AWAITING_CONFIRM`, return segment times |
| `POST` | `/me/clock/discard` | Abandon awaiting confirm (no report) |

Confirm **does not** get a dedicated endpoint — frontend calls:

- `POST /reports` when one segment
- `POST /reports/batch` when midnight split yields two segments (atomic)

After successful report create, backend marks session `DISCARDED` or deletes row.

### 3. Start gates (server-side, 409/403 + Hebrew)

- Month locked
- Full-day absence on start date (half-day allowed)
- Zero assigned tasks
- Existing `ACTIVE` session (block second start)
- User deactivated / unauthenticated → 401

### 4. Stop / confirm rules

- Minimum session length **5 minutes** — block confirm with 400 + Hebrew field error
- Required on confirm: `workLocation`, `clientId`, `projectId`, `taskId`; `description` optional
- Assigned-only hierarchy validation (same rules as manual create)
- Midnight split: server computes two `{ date, startTime, endTime }` segments on stop; modal once; confirm sends batch with two rows sharing hierarchy/location/description
- Row `date` = segment calendar date (start-date rule for first segment)

### 5. EOD auto-stop

- Scheduled job (node-cron in dev; same pattern as other backend jobs if any) at 23:59 **Asia/Jerusalem** (align with product locale)
- Sets `stoppedAt`, `status=AWAITING_CONFIRM`, `autoStopped=true`
- Next `GET /me/clock/session` returns draft; frontend opens modal

**Alternative rejected:** silent auto-confirm — user must pick project/task/location.

### 6. Frontend state

- Idle home: orange **הפעלת שעון**
- Active: replace CTA with elapsed HH:MM:SS + **עצור שעון** (manual **דיווח ידני** still available)
- On mount + window focus: refetch session
- Stop → Ant Design Modal → stepped sheets (reuse manual picker components)
- Confirm success → toast, clear session, refresh day totals if wired

### 7. Reporting options filter

Implement assignment join now (User ↔ Task) so clock and manual share `GET /me/reporting-options` assigned-only tree. **MODIFIED** delta on `time-reports` replaces the “until SCRUM-71” escape hatch.

### 8. Coexistence with manual reports

No mutual exclusion. Day totals and 9h soft warnings use existing aggregation — clock rows are normal reports after confirm.

## Risks / Trade-offs

- **[Risk] EOD job missed in single-instance dev** → Mitigation: manual stop still works; document cron; integration test simulates job
- **[Risk] User leaves `AWAITING_CONFIRM` forever** → Mitigation: home banner/modal prompt on load; discard action available
- **[Risk] Assignment model not in Prisma yet** → Mitigation: first tasks add migration + seed; block clock start until migration deployed
- **[Risk] Midnight split + batch confirm partial failure** → Mitigation: existing batch transaction semantics (all or nothing)

## Migration Plan

1. Deploy migration (`WorkClockSession` + assignment table if missing)
2. Deploy backend with cron disabled in test; enable in production compose
3. Deploy frontend — removes **בקרוב** disabled clock
4. Rollback: revert frontend to disabled clock; backend routes return 404; sessions table harmless if unused

## Open Questions

- Exact Hebrew strings for new errors (copy review with Figma)
- Whether home should auto-open stop modal immediately after EOD auto-stop or show a dismissible banner first (default: open modal on load when `AWAITING_CONFIRM`)
