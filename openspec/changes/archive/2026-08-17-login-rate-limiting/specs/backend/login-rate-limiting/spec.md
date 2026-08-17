## Purpose

Brute-force protection for the credential-handling routes: counting failed attempts against a client and against a targeted account, and refusing further attempts once either exceeds its threshold, without revealing whether the targeted account exists.

## ADDED Requirements

### Requirement: Failed credential attempts are counted and throttled

The service SHALL count failed credential attempts against the credential-handling routes and SHALL refuse further attempts from a caller once a configured threshold is exceeded within a configured rolling window.

Attempts SHALL be counted against two independent keys, each with its own threshold over the same window:

- the **email submitted** in the request, and
- the **originating client address**.

Exceeding either threshold SHALL cause rejection. Only failed attempts SHALL increment a counter; a request rejected because a threshold was already exceeded SHALL NOT itself increment the counter further, so a caller who keeps retrying cannot extend their own cooldown indefinitely.

Both thresholds and the window length SHALL be supplied by deployment configuration rather than fixed in code. The email threshold SHALL be the tighter of the two.

#### Scenario: Attempts below the threshold are unaffected

- **WHEN** a caller submits fewer failed attempts than the configured email threshold within the window
- **THEN** each attempt is processed normally and rejected on its own merits with `401`

#### Scenario: Email threshold exceeded

- **WHEN** the number of failed attempts for a given submitted email reaches the configured email threshold within the window
- **THEN** the next attempt for that email is refused with `429` without the supplied password being checked

#### Scenario: Client-address threshold exceeded across many accounts

- **WHEN** a single client address accumulates failed attempts against many different emails, reaching the configured address threshold within the window
- **THEN** the next attempt from that address is refused with `429`, even for an email that has no failures of its own

#### Scenario: Retrying while throttled does not extend the cooldown

- **WHEN** a throttled caller keeps sending attempts before the window has elapsed
- **THEN** each is refused with `429` and the time remaining until attempts are permitted again continues to decrease

#### Scenario: Correct credentials are still refused while throttled

- **WHEN** a caller who has exceeded a threshold submits the correct password
- **THEN** the request is refused with `429` and no session is issued

### Requirement: Throttling recovers without intervention

A throttle SHALL expire on its own once the configured window has elapsed. It SHALL NOT require an administrator, a support request, or any manual action to clear.

A successful authentication SHALL clear the failure count for the email that succeeded, so a user who mistypes their password several times and then gets it right starts from a clean slate.

#### Scenario: Window elapses

- **WHEN** the configured window passes after a caller was throttled, with no further attempts
- **THEN** attempts from that caller are accepted for processing again

#### Scenario: Success clears the account's failures

- **WHEN** a caller fails several times, then authenticates successfully while still below the threshold
- **THEN** the accumulated failure count for that email is cleared, and a subsequent failure starts counting from zero

#### Scenario: No administrator action is required

- **WHEN** a legitimate user is throttled after mistyping their password
- **THEN** they regain access by waiting out the window, with no account state an administrator must reset

### Requirement: Throttling discloses no account-existence information

Counting and refusal SHALL be keyed on the email string as submitted, regardless of whether an account with that email exists. A caller SHALL NOT be able to distinguish a registered email from an unregistered one by observing throttle behaviour — neither by which responses are throttled, nor by the response body, nor by how long a response takes.

#### Scenario: Unregistered email is throttled identically

- **WHEN** a caller submits repeated failed attempts against an email with no matching account, reaching the threshold
- **THEN** the response is `429`, identical in status, error code, and message to the response for a registered email at the same threshold

#### Scenario: Response body reveals nothing about the target

- **WHEN** any throttled response is returned
- **THEN** its body identifies only that too many attempts were made, and names no account, no attempt count for a specific user, and no indication that the email was found

### Requirement: Throttled responses use the standard error contract

A throttled request SHALL be rejected with HTTP `429` using the same error body shape as every other error in the API, carrying an error code that identifies throttling specifically so a client can distinguish it from a rejected credential.

The response SHALL indicate how long the caller must wait before attempting again, via the standard `Retry-After` response header.

#### Scenario: Throttled response shape

- **WHEN** a request is refused for exceeding a threshold
- **THEN** the service responds `429` with the standard error body and an error code distinct from the code used for invalid credentials

#### Scenario: Client is told how long to wait

- **WHEN** a request is refused for exceeding a threshold
- **THEN** the response carries a `Retry-After` header giving the remaining wait

### Requirement: Client address is resolved from trusted configuration

The address a request is attributed to SHALL be derived according to deployment configuration describing the proxy layers in front of the service. A caller SHALL NOT be able to evade or redirect address-based counting by supplying forwarding headers themselves when no proxy is configured as trusted.

#### Scenario: Forwarded headers from an untrusted source are ignored

- **WHEN** a request arrives carrying a forwarding header claiming a different origin address, and the deployment declares no trusted proxy
- **THEN** the request is attributed to its actual connecting address, not the claimed one

#### Scenario: Deployment behind a proxy attributes the real client

- **WHEN** the deployment declares its proxy layers as trusted and a request arrives through them
- **THEN** the request is attributed to the originating client address rather than the proxy's own address

### Requirement: Throttling covers every credential-handling route

Both password authentication and self-service password change SHALL be throttled. A caller SHALL NOT be able to reset or evade a throttle by switching between these routes.

#### Scenario: Password-change route is throttled

- **WHEN** an authenticated caller makes repeated failing password-change requests reaching the configured threshold
- **THEN** further requests to that route are refused with `429`

#### Scenario: Throttle is not evaded by switching routes

- **WHEN** a caller throttled by attempts against one credential-handling route immediately calls the other
- **THEN** the address-based throttle still applies
