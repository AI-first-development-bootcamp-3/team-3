## Why

No lint or format enforcement exists yet. As soon as more than one file changes per PR, style drift and
avoidable bugs (unused vars, missing deps in hooks) start costing review time. Cheap to add now, before
there's a backlog to retrofit.

## What Changes

- Configure ESLint for React + TypeScript
- Configure Prettier and wire it to not fight ESLint's formatting rules
- Add `npm run lint` and `npm run format` scripts

## Capabilities

### New Capabilities
_None — this change creates no user-facing behavior to specify._

### Modified Capabilities
_None._

## Impact

New ESLint/Prettier config files and `devDependencies` in `frontend/package.json`. No application code
changes.
