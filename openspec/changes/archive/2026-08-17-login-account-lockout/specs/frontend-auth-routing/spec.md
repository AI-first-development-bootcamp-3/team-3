## ADDED Requirements

### Requirement: Login page distinguishes a locked email and counts down the wait

When a login attempt is refused because the email is locked for sustained failed attempts, the login page SHALL tell the user that specifically. It SHALL NOT reuse the invalid-credentials message, the throttled message, or the generic failure fallback — the first invites more futile retries, and neither of the others conveys how long the wait is.

The message SHALL state the time remaining before the user may try again, taken from the response rather than assumed by the client, and SHALL update that time as it elapses so the user sees it counting down without reloading the page. When the wait reaches zero the page SHALL let the user submit again.

The message SHALL NOT state or imply anything about whether the email entered belongs to a real account.

#### Scenario: Attempt refused as locked

- **WHEN** a submitted login is refused because the email is locked
- **THEN** the page shows a message identifying that the account is temporarily locked and stating the time remaining before another attempt is allowed

#### Scenario: Remaining time counts down live

- **WHEN** the locked message is displayed and time passes
- **THEN** the displayed remaining time decreases without the user reloading or resubmitting

#### Scenario: Wait elapses

- **WHEN** the displayed remaining time reaches zero
- **THEN** the page no longer presents the user as blocked, and the form can be submitted again

#### Scenario: Locked message is distinct from the other failures

- **WHEN** a login is refused as locked
- **THEN** the message shown differs from the incorrect-email-or-password message, from the too-many-attempts message, and from the generic "something went wrong" fallback

#### Scenario: Form stays usable

- **WHEN** the locked message is shown
- **THEN** the form's fields retain what the user typed, so a user who waits out the lock is not forced to re-enter their email

#### Scenario: Locked message reveals nothing about registration

- **WHEN** the locked message is shown
- **THEN** its wording is the same whether or not the entered email belongs to a real account
