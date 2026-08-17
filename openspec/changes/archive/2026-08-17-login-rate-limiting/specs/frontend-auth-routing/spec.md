## ADDED Requirements

### Requirement: Login page distinguishes a throttled attempt

When a login attempt is refused because too many attempts have been made, the login page SHALL tell the user that specifically. It SHALL NOT reuse the invalid-credentials message, which would send the user into more futile retries, and SHALL NOT fall back to the generic failure message, which gives no actionable next step.

The message SHALL tell the user to wait and try again, and SHALL NOT state or imply anything about whether the email they entered belongs to a real account.

#### Scenario: Attempt refused as throttled

- **WHEN** a submitted login is refused for exceeding an attempt threshold
- **THEN** the page shows a message identifying that too many attempts were made and that the user should wait before retrying

#### Scenario: Throttled message is distinct from invalid credentials

- **WHEN** a login is refused as throttled
- **THEN** the message shown differs from the one shown for an incorrect email or password, and from the generic "something went wrong" fallback

#### Scenario: Invalid credentials still shows its own message

- **WHEN** a login is refused because the credentials are wrong and no threshold has been exceeded
- **THEN** the existing incorrect-email-or-password message is shown, unchanged

#### Scenario: Form stays usable

- **WHEN** the throttled message is shown
- **THEN** the form's fields retain what the user typed and the form can be submitted again, so a user who waits out the window is not forced to re-enter their email
