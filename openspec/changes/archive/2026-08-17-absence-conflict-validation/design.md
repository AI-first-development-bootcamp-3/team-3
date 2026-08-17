## Context

See `proposal.md` → Why/Impact for motivation and the blocking-dependency list. Two constraints already fixed elsewhere in this repo shape this design, not open for reconsideration here:

- **`Absence` schema** (`openspec/changes/absences-schema/design.md`, branch `Absences/data-model-and-migrations/SCRUM-151`): one row per absence spanning `startDate`..`endDate` (`@db.Date`), a `halfDay` boolean, `isActive` doubling as soft-delete/cancelled, indexed on `[userId, isActive, startDate, endDate]`. That design doc explicitly deferred "the half-day ↔ hours-report correlation" to "whichever ticket implements SCRUM-149, once a `Report`/time-entry schema exists" — this change is that correlation.
- **`TimeReport` schema** (branch `feat/SCRUM-121-reports-post`): one row per report line — `userId, clientId, projectId, taskId, date (@db.Date), workLocation, startTime, endTime (@db.Time), description`. No stored duration column; a line's hours are `endTime - startTime`, and a date's total reported hours is the sum across every `TimeReport` row for that `userId`+`date`. SCRUM-117 fixes the standard day at **9 hours**; SCRUM-149 fixes half-day at **4.5 hours**.
- **`expandWorkingDays`** (`backend/src/services/workingDays.service.ts`, branch `Absences/Working-day-calculation/SCRUM-144`): pure function, Israeli work week (Sun–Thu), throws on an inverted range. This change's per-day logic (below) is about checking each *calendar* day in the absence range against reported hours, not about which days are working days — Friday/Saturday inside an absence range still need a conflict check if (hypothetically) a report exists for them, so this change iterates the raw date range, not the working-day-filtered one. `expandWorkingDays` is not a dependency of this change; it's listed as reused context only where a future duration-display feature might combine the two.

## Goals / Non-Goals

**Goals:**
- One function, called identically by the create path (SCRUM-162) and the edit path (SCRUM-173), that returns every conflicting date and why
- Correct under the ambiguous edges the Jira acceptance criteria don't spell out (see Decisions → Conflict rule), by generalizing to one consistent hours-budget rule rather than special-casing the two examples given
- Cheap: a small, fixed number of queries regardless of how many days the absence spans

**Non-Goals:**
- No Hebrew message composition (proposal.md → Non-goals) — this function's output is data, not display text
- No persistence — this function only reads and reports; the caller decides what to do with a clean result, including any transactional guarantee around the subsequent write (see Risks)
- No request-shape validation (type enum, missing fields, month-lock) — that is SCRUM-162/173's request-validation layer, not this function

## Decisions

### Conflict rule: one hours-budget, not two special cases

The Jira acceptance criteria give two examples — "full-day absence rejected when the day is *already fully reported*" and "half-day absence permitted alongside *half a day* of work" — but leave two combinations unstated: a full-day absence against a *partially* (not fully) reported day, and a half-day absence against *more than* half a day reported. Rather than leaving those undefined, this change applies one rule uniformly: **an absence claims `9` hours if full-day or `4.5` hours if half-day; it conflicts on a given date once that claim plus the user's already-reported hours for that date would exceed `9`.** Concretely:

| Absence type | Reported hours that date | Result |
|---|---|---|
| Full-day | `0` | OK |
| Full-day | `> 0` (any amount, including a full 9) | Conflict |
| Half-day | `<= 4.5` | OK |
| Half-day | `> 4.5` | Conflict |

This reproduces both worked examples from the Jira ACs exactly (full+full conflicts, half+half is fine) and resolves the two unstated combinations the same way a reasonable person reading "the day is spoken for" would. **Flagging this as a decision, not a certainty** — if product intends a full-day absence to tolerate a few stray reported hours (e.g. a pre-existing correction entry), that's a narrower rule than this one and should be raised before SCRUM-162 ships against this function's current contract.

*Alternative considered:* implement only the two literal examples (check `=== 0` / `=== 9` / `=== 4.5` exactly) and leave every other combination unchecked. Rejected — it would let a full-day absence coexist with an 8-hour report, which is the exact contradiction SCRUM-145 exists to prevent; matching the letter of the AC over its evident intent.

### Query shape: range overlap query + one grouped sum, not per-day round-trips

Two queries per check, independent of how many days the absence spans:
1. **Absence overlap**: one query for active (`isActive: true`, handled automatically by the soft-delete extension) absences for the user where `startDate <= proposedEndDate AND endDate >= proposedStartDate`, optionally excluding the absence's own id on the edit path. Overlapping rows are expanded to their specific overlapping dates in application code (the range itself is never more than a few weeks).
2. **Reported hours**: one query for `TimeReport` rows for the user with `date` in the proposed range, summing `endTime - startTime` grouped by `date` in application code (row counts here are small — a handful of report lines per day at most).

Both queries run in parallel (`Promise.all`); no reason to serialize them since neither depends on the other's result.

*Alternative considered:* iterate each date in the range and query per day. Rejected — turns an `O(1)`-query check into `O(days)` queries for no benefit; the two-query shape above already produces per-date results by grouping in memory.

### Result shape: dated, reasoned conflict list

```ts
interface AbsenceConflict {
  date: string; // ISO YYYY-MM-DD
  reason: 'OVERLAPPING_ABSENCE' | 'WORK_HOURS_CONFLICT';
}

interface AbsenceConflictCheckResult {
  hasConflict: boolean;
  conflicts: AbsenceConflict[];
}
```

A caller building the Hebrew message from SCRUM-145's AC needs both the date and *why*, not just a boolean — "overlaps an existing absence" and "day already has reported hours" read differently in the UI. `hasConflict` is redundant with `conflicts.length > 0` but kept as an explicit field so call sites don't need the array-emptiness idiom to branch.

### Self-exclusion via an optional parameter, not a separate function

```ts
function checkAbsenceConflicts(params: {
  userId: string;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  excludeAbsenceId?: string;
}): Promise<AbsenceConflictCheckResult>
```

One function serves both SCRUM-162 (create — `excludeAbsenceId` omitted) and SCRUM-173 (edit — pass the absence's own id), matching SCRUM-157's AC verbatim ("one implementation shared by the create and edit paths"). Excluding by id in the overlap query (`id: { not: excludeAbsenceId }`) is a one-line addition to query 1 above; no second code path.

## Risks / Trade-offs

**Check-then-persist race between two concurrent requests.** This function only reads; nothing stops two overlapping absences from both passing the check if submitted at nearly the same instant, then both being persisted by the caller. Unlike `createUser`'s duplicate-email case (`backend/src/services/adminUser.service.ts`), there is no database-level constraint backing this up — `absences` has no Postgres exclusion constraint over `[userId, daterange(startDate, endDate)]`. → Mitigation: out of scope for this change (SCRUM-157 asks for the application-level check, not a schema change); the caller (SCRUM-162/173) should still perform the check immediately before the write inside one request. A `gist` exclusion constraint is a strictly stronger future improvement, not required for this ticket's acceptance criteria, and would need its own design pass (Prisma's raw-SQL migration escape hatch, same as the existing `endDate >= startDate` CHECK).

**Half-day flag on a multi-day range is untested territory.** The `Absence` schema allows `halfDay: true` on a range longer than one day; nothing in SCRUM-149 or the schema design discusses what that means. This change applies the half-day budget (4.5h) uniformly to every date in the range, which is the only consistent reading available, but no product requirement confirms multi-day half-day absences are a real case. → Mitigation: not blocking — the rule degrades safely (it's simply applied per-date either way); flagged here so it isn't mistaken for a deliberate product decision if it surfaces later.

## Migration Plan

Additive only — a new service module and its tests; no schema change of its own. Cannot land until the two blocking dependencies in `proposal.md` → Impact are present on this branch (or this branch is rebased onto a `development` that has them). No rollback concern: nothing calls this function yet, since SCRUM-162/173 are separate, later tickets.

## Open Questions

- Should the hours-budget conflict rule (Decisions, above) be confirmed with product before SCRUM-162/173 build against it, given it extends past the two literal Jira examples? Doesn't change this change's specs or task breakdown either way — the function is written once, against one rule; only the rule's exact thresholds could change.
- Is a Postgres exclusion constraint on `absences` worth a future ticket, given the race condition noted under Risks? Independent of this change's implementation.
