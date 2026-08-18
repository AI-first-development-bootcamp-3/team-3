## Purpose

A durable record of failed credential attempts against the login and password-change routes, kept so that a suspected attack can be reviewed after the fact and so that lockout decisions rest on evidence that outlives any single process.

## ADDED Requirements

### Requirement: Failed credential attempts are recorded durably

The service SHALL record every failed credential attempt against the credential-handling routes in durable storage, not in process memory. A record SHALL survive process restart and SHALL be visible to every replica of the service.

Each record SHALL capture:

- the **normalised submitted email** (trimmed and case-folded), recorded whether or not an account exists for it,
- the **account** the email resolved to, when one exists, and an explicit absence when it does not,
- the **originating client address**,
- the **outcome** of the attempt, distinguishing a credential rejection, a refusal for exceeding a threshold, a refusal because the email is locked, and a success,
- the **time** of the attempt.

Successful authentications SHALL be recorded too, marked as such. Recording them keeps the trail readable — a reviewer can see that a burst of failures ended in a success — and gives lockout a boundary to count from without deleting evidence.

Records SHALL be append-only. Clearing an email's accumulated failures, as `backend/login-account-lockout` requires on a successful login, SHALL NOT be implemented by deleting or altering prior records.

#### Scenario: Failed attempt against a registered email

- **WHEN** a login attempt for a registered email is rejected for an incorrect password
- **THEN** a record is written capturing the normalised email, the resolved account, the client address, a credential-rejection outcome, and the time

#### Scenario: Failed attempt against an unregistered email

- **WHEN** a login attempt supplies an email with no matching account and is rejected
- **THEN** a record is written capturing the normalised email with an explicit absence of a resolved account, on the same terms as a registered email

#### Scenario: Records outlive the process

- **WHEN** the service is restarted after failed attempts have been recorded
- **THEN** those records are still present and still count toward any window that has not yet elapsed

#### Scenario: Successful login is recorded as a success

- **WHEN** a login attempt succeeds
- **THEN** a record is written marked as a success, and it does not count as a failure toward any threshold

#### Scenario: Clearing failures preserves the trail

- **WHEN** a successful login clears an email's accumulated failures
- **THEN** the records of those failures remain readable afterwards, unaltered

#### Scenario: Refusals are distinguishable from credential rejections

- **WHEN** attempts are refused for exceeding a threshold or because the email is locked
- **THEN** their records carry an outcome distinct from a plain credential rejection, so a reviewer can tell a guessing burst from the defences firing

### Requirement: Recorded attempts exclude submitted secrets

A record SHALL NOT contain the submitted password, any hash of it, or any other credential material, in any field. This holds even when the value would be captured incidentally — a caller who types their password into the email field SHALL NOT thereby have it written to the audit record in recoverable form.

#### Scenario: Password is never recorded

- **WHEN** any failed attempt is recorded
- **THEN** the record contains no representation of the submitted password

#### Scenario: Existing redaction is not weakened

- **WHEN** an attempt is recorded and the request is also logged by the standard request logger
- **THEN** the fields that logger already redacts remain redacted, and the new record introduces no path by which they reach storage unredacted
