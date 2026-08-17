## Why

`admin-create-user-backend` (merged) returns the new user's temporary password once, in the API response — the only channel to relay it until now, requiring the admin to manually copy/paste it to the new hire. SCRUM-208 automates that: email the credentials directly.

## What Changes

- `EmailSender` interface (`{ send({ to, subject, text }): Promise<void> }`), mirroring the existing `FileStorage` interface pattern (one contract, swappable implementations)
- `consoleEmailSender` — logs the message instead of sending; the default in every environment until SMTP is configured
- `smtpEmailSender` — real delivery via `nodemailer`, only constructed when `SMTP_HOST` is set
- `emailSender.ts` selects between them based on `env.SMTP_HOST`
- Wired into `adminUser.service.ts`: after a successful creation, sends the credential email; a failure is logged and swallowed, not surfaced to the caller — the temp password already in the API response is the fallback channel
- New optional env vars: `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` (defaults to a placeholder address)

### Non-goals

- An actual configured SMTP provider for this environment (the interface + implementation exist; nothing forces anyone to configure `SMTP_HOST` yet)
- HTML email templates — plaintext only, matching the project's minimal-viable-first approach elsewhere

## Capabilities

### New Capabilities

- `backend/credential-email`: Automatic delivery of a new user's temporary password by email, falling back to logging when no SMTP provider is configured
