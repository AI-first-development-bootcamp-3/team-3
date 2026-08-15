## Why

No test runner exists yet. Every subtask from here on (forms, routing guards, absence rules) needs
somewhere to put unit tests as it's built, not bolted on retroactively.

## What Changes

- Configure Vitest as the unit-test runner
- Add `npm test` script
- One sample unit test to prove the setup works end to end

## Capabilities

### New Capabilities
_None — this change creates no user-facing behavior to specify._

### Modified Capabilities
_None._

## Impact

New `vitest.config.ts` (or Vite config extension) and `devDependencies`. One sample test file, no
production code changes.
