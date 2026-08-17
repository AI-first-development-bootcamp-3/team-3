## Context

- `feat/SCRUM-204-create-user-api`, cut from `story-scrum61` after `minimal-login` merged into it — `authenticate`, `requireRole`, `validate`, `AppError`, and `User.mustChangePassword` are all already in place.
- Precedent for admin-only + validated + service-layered endpoints: `attachment.routes.ts`/`.controller.ts`/`.service.ts`.

## Decisions

### Rely on the DB unique constraint for duplicate-email detection, not a separate `findUnique` check
A check-then-create has a race: two concurrent requests for the same email could both pass the check before either creates. Catching `Prisma.PrismaClientKnownRequestError` with code `P2002` on the `create()` call itself is race-free and one query instead of two.
*Gotcha hit during implementation:* `config/prisma.ts` re-exports `Prisma` as `export type { Prisma }` — a type-only export. Importing `{ Prisma }` from there gives `undefined` at runtime, so `error instanceof Prisma.PrismaClientKnownRequestError` throws inside the catch block itself (masked as an unrelated 500). Fixed by importing `Prisma` from `../generated/prisma/client.js` directly, where it's a real value export.

### Temporary password: admin-suppliable, defaults to generated
`temporaryPassword` is optional in the request body; when omitted, the service generates one (`crypto.randomBytes(9).toString('base64url')`, ~12 chars, URL-safe). Either way it's returned once in the response, plaintext, and never stored — only its bcrypt hash is persisted.

### Response shape includes the plaintext password, not just the user
Until `user-credential-email` exists, this is the only way the admin can relay credentials to the new user. Accepted as an intentional, temporary interim (the next sprint automates delivery instead of requiring the admin to copy/paste it).

## Risks / Trade-offs

**Plaintext temporary password appears in the API response and, transitively, in server access logs if request/response logging is ever added at that verbosity.** Existing `requestLogger` middleware logs method/path/status/duration only, not bodies, so this isn't currently a real exposure — worth keeping in mind if that ever changes.

## Migration Plan

No schema changes in this sprint (already done by `minimal-login`). Purely additive: one new route, no existing behavior touched.

## Open Questions

None blocking.
