All on `feat/SCRUM-208-credential-email`, cut from `story-scrum61`. Covers SCRUM-208.

## 1. Backend

- [x] 1.1 `nodemailer` installed and pinned at 9.0.5 (first install pulled a range with a high-severity advisory; upgraded, `npm audit` clean)
- [x] 1.2 `types/emailSender.ts` — `EmailSender`/`EmailMessage` interface
- [x] 1.3 `consoleEmailSender.ts` — logs instead of sending, the default
- [x] 1.4 `smtpEmailSender.ts` — real nodemailer transport, only constructed when `SMTP_HOST` is set
- [x] 1.5 `emailSender.ts` — selects between them based on `env.SMTP_HOST`
- [x] 1.6 `env.ts` — `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`EMAIL_FROM`, all optional except sensible defaults; `.env.example` documents them
- [x] 1.7 `adminUser.service.ts` — sends the credential email after successful creation; failure logged at `warn`, never surfaced to the caller
- [x] 1.8 Tests: email sent with the correct recipient and temporary password embedded (spy-based), creation still succeeds and persists when the send fails; `consoleEmailSender` unit test; `env.test.ts` updated for the two new fields

## 2. Verify

- [x] 2.1 Backend suite: 99/99 passing, lint + typecheck clean
- [x] 2.2 Manual check (with Dan): created a user via the running dev server and confirmed the exact JSON log line for the credential email appeared, with the correct recipient and temporary password embedded — after ruling out a red herring (stale server processes across restarts, and pino-pretty's worker-thread transport not being the actual logging path for the "Server listening" line, which is a separate `console.log`)
- [ ] 2.3 Open PR `feat/SCRUM-208-credential-email` → `story-scrum61`
