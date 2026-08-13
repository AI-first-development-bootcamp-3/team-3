# Backend

## Soft delete

`User`, `Client`, `Project`, and `Task` are never hard-deleted — historical
time reports and audit trails need to keep resolving records that are no
longer active.

This is enforced by a Prisma Client Extension (`src/config/prisma.ts`), not
by application code, so it applies uniformly and can't be forgotten at a call
site:

- `delete` / `deleteMany` on these models are rewritten into
  `update` / `updateMany { isActive: false }` — the row stays in the table.
- Reads (`findMany`, `findFirst`, `findUnique`, `count`) get `isActive: true`
  injected into `where` by default, so deactivated rows are invisible unless
  asked for.

**Opting out:** pass `isActive: undefined` explicitly inside `where` to
include deactivated records, e.g.:

```ts
await prisma.client.findMany({ where: { isActive: undefined } });
```

An explicit key in `where` — even set to `undefined` — is left untouched by
the extension; only a `where` with no `isActive` key at all gets the default
filter applied.
