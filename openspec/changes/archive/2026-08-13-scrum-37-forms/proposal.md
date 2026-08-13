## Why

Nearly every remaining Story is a form: daily hours reporting, absence reporting, five Admin CRUD
screens. Each needs required-field checks and, often, cross-field rules (end time after start time,
half-day plus remaining work hours). That pattern needs to be settled once, not reinvented per Story.

## What Changes

- Install React Hook Form and a validation schema library
- Establish the integration pattern between React Hook Form and Ant Design's form inputs
- Build one sample form proving required-field validation and a cross-field rule work together

## Capabilities

### New Capabilities
- `frontend-forms`: the app's form-handling pattern — how validation schemas, React Hook Form and Ant
  Design's inputs compose, so every feature Story's form follows the same shape.

### Modified Capabilities
_None._

## Impact

New dependencies (`react-hook-form`, `zod`, `@hookform/resolvers`). New `src/components/` files for the
sample form and its schema. No existing code changes.
