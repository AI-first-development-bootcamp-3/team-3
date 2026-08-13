## Context

Builds on the Vite scaffold. No test runner exists yet. See proposal.md for why this needs to land
before feature work starts.

## Goals / Non-Goals

**Goals:**
- A working test runner and `npm test` script
- One passing sample test proving the setup end to end

**Non-Goals:**
- Component/DOM testing (React Testing Library) — that's SCRUM-43, a separate subtask. This change's
  sample test is a plain function test, not a component render test, so it doesn't anticipate that work.
- Coverage thresholds or CI wiring — not asked for by this subtask.

## Decisions

- **Vitest over Jest** — the ticket allows either; Vitest shares the project's existing Vite config and
  transform pipeline (TS, JSX) with zero extra setup, where Jest would need its own transformer config
  duplicating what Vite already does.
- **Sample test is a trivial pure-function test**, not a component test — there's no real application
  logic yet to test meaningfully, and reaching for React Testing Library here would pre-empt SCRUM-43's
  actual scope. The sample proves the runner works; it isn't meant to be a template for future tests.

## Risks / Trade-offs

None material — this is additive tooling with no runtime impact.
