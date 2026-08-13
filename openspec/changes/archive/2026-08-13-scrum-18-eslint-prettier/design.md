## Context

The Vite scaffold from SCRUM-16 shipped `oxlint` (Vite's current default) already configured for
React + TypeScript with a working `npm run lint`. SCRUM-18 asks specifically for ESLint — decided to
replace oxlint rather than keep it, since the ticket names the tool explicitly and ESLint is the more
widely-known baseline if teammates join this epic later.

## Goals / Non-Goals

**Goals:**
- ESLint configured for React + TypeScript, replacing oxlint
- Prettier configured and not fighting ESLint's formatting rules
- `npm run lint` and `npm run format` scripts

**Non-Goals:**
- Fixing every existing lint finding across the codebase beyond what the current small file set needs
- Pre-commit hooks — not asked for by this subtask

## Decisions

- **Remove oxlint entirely** rather than run both — two linters disagreeing on the same code is worse
  than one, and the ticket's intent is ESLint specifically.
- **`eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`** — the
  same stack Vite's own `react-ts` template used before it switched its default to oxlint. Proven
  config, not reinvented.
- **`eslint-config-prettier`** to disable ESLint's stylistic rules that would conflict with Prettier,
  rather than manually reconciling rule-by-rule.
- **Prettier defaults**, no custom `.prettierrc` overrides — nothing about this codebase needs
  non-default formatting yet.

## Risks / Trade-offs

- Losing oxlint's speed advantage — acceptable at this codebase size; revisit only if lint time becomes
  a real friction point.
