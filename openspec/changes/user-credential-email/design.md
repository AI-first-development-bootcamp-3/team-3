## Context

- `feat/SCRUM-208-credential-email`, cut from `story-scrum61` after `admin-create-user-backend` merged into it.
- Precedent: `FileStorage`/`localFileStorage` — a narrow interface with one implementation today, designed so a second (S3) can replace it without touching callers. `EmailSender` follows the identical shape for the identical reason.

## Decisions

### Default to logging, not throwing, when no SMTP is configured
Every environment (including fresh local dev clones) works out of the box — nobody is forced to set up a mail provider just to exercise user creation. `consoleEmailSender` is the default; `SMTP_HOST` being set is what opts into `smtpEmailSender` instead.

### A failed send never fails the request
`createUser()` already returns the temporary password in its response. If the email fails (bad credentials, provider outage), the admin still has that fallback channel — failing the whole creation over a secondary delivery mechanism would be a worse failure mode than "user created, email didn't go out, admin relays the password from the response instead." The failure is logged at `warn` so it's visible to whoever's watching, not silent.

### nodemailer pinned to 9.0.5+
The first install pulled in a version range with a known high-severity SMTP command-injection advisory (multiple CVEs around unsanitized envelope/header fields). All are fixed by 9.0.5; installed and pinned there directly rather than accepting the vulnerable range and patching later.

## Risks / Trade-offs

**No SMTP provider is actually configured anywhere yet** — this ships the mechanism, not a working credential-delivery pipeline end-to-end in any real environment. Acceptable: configuring a real provider (Mailtrap sandbox, SES, etc.) is an ops/deployment decision outside this branch's scope, and the interface means it's a config change, not a code change, once someone makes that call.

**Plaintext temporary password appears in the email body.** Standard practice for transactional "here are your temp credentials, you'll be forced to change them" email — the `mustChangePassword: true` flag from `minimal-login` is what makes this acceptable (the password is single-use by design).

## Migration Plan

Purely additive - no existing behavior changes when `SMTP_HOST` stays unset (the default), which is true of every environment right now.

## Open Questions

None blocking. Whether/when to configure a real SMTP provider for staging or production is a separate decision for whoever owns deployment.
