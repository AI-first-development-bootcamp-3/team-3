## Purpose

A durable lock above the in-memory throttle: sustained failed attempts against one email stop being accepted for a fixed period, on a decision that survives restart and is shared across replicas, without revealing whether the targeted email belongs to a real account.

## ADDED Requirements

### Requirement: Sustained failed attempts lock an email

The service SHALL refuse further credential attempts for an email once the number of failed attempts recorded against it reaches a configured threshold within a configured rolling window. The refusal SHALL last for a configured duration measured from the attempt that reached the threshold.

The threshold, the window, and the lock duration SHALL be supplied by deployment configuration rather than fixed in code. The threshold SHALL be higher, and the window longer, than those of the throttle defined by `backend/login-rate-limiting`, so that ordinary mistyping is caught by the self-clearing throttle and only sustained attempts reach the lock.

A locked attempt SHALL be refused before the supplied password is compared.

#### Scenario: Attempts below the threshold do not lock

- **WHEN** an email accumulates fewer failed attempts than the configured threshold within the window
- **THEN** each attempt is rejected on its own merits and the email is not locked

#### Scenario: Threshold reached

- **WHEN** the failed attempts recorded for an email reach the configured threshold within the window
- **THEN** the next attempt for that email is refused as locked, without the supplied password being checked

#### Scenario: Correct credentials are still refused while locked

- **WHEN** a caller submits the correct password for a locked email
- **THEN** the request is refused as locked and no session is issued

#### Scenario: A lock applies to the email, not the caller

- **WHEN** an email is locked and an attempt for it arrives from a different client address
- **THEN** that attempt is refused as locked as well

### Requirement: Locking leaks no account-existence information

A lock SHALL be keyed on the **submitted email string**, whether or not an account exists for it. An unregistered email SHALL accumulate attempts and lock on exactly the same terms as a registered one, and its locked response SHALL be indistinguishable from a registered email's.

This preserves the guarantee made by `backend/login-endpoint` and `backend/login-rate-limiting` that a caller cannot learn from any login response whether an email is registered.

#### Scenario: Unregistered email locks identically

- **WHEN** an email with no matching account accumulates failed attempts reaching the threshold
- **THEN** subsequent attempts for it are refused as locked, with a response identical to that for a locked registered email

#### Scenario: Lock state is not an existence oracle

- **WHEN** a caller drives a registered email and an unregistered email to the threshold by the same sequence of attempts
- **THEN** the two sequences of responses are indistinguishable, including the point at which locking begins

### Requirement: A lock self-expires and reports its remaining time

A lock SHALL expire on its own once the configured duration has elapsed. It SHALL NOT require an administrator, a support request, or any manual action to clear.

A locked response SHALL carry the time remaining until attempts are accepted again, so a client can tell the user how long to wait. Continuing to attempt while locked SHALL NOT extend the lock.

A successful authentication SHALL clear the failures accumulated for that email, so a user who eventually gets their password right does not carry an old count toward a future lock.

#### Scenario: Lock expires without intervention

- **WHEN** the configured lock duration elapses after an email was locked
- **THEN** attempts for that email are accepted for processing again, with no administrator action taken

#### Scenario: Remaining time is reported and decreases

- **WHEN** a caller attempts a locked email repeatedly before the duration has elapsed
- **THEN** each response reports the time remaining, and that time continues to decrease rather than resetting

#### Scenario: Success clears accumulated failures

- **WHEN** an email accumulates failures while still below the threshold, then authenticates successfully
- **THEN** those failures no longer count toward locking it, and a subsequent failure starts from zero

### Requirement: Locked attempts are refused with a distinct status

A locked attempt SHALL be refused with `423`, using the standard error contract and carrying the remaining lock time in a `Retry-After` header.

`423` SHALL be distinct from the `429` used for the throttle, so a client can word the two conditions differently. It SHALL NOT be conditioned on whether the email is registered.

#### Scenario: Locked response shape

- **WHEN** an attempt for a locked email is refused
- **THEN** the service responds `423` using the standard error contract, with a `Retry-After` header giving the seconds remaining

#### Scenario: Locked is distinguishable from throttled

- **WHEN** one caller is refused for exceeding the throttle threshold and another for a locked email
- **THEN** the first receives `429` and the second `423`

### Requirement: Locking survives restart and applies across replicas

Lock decisions SHALL be derived from durably recorded attempts rather than from per-process state. Restarting the service SHALL NOT clear an active lock or reset progress toward one, and two replicas SHALL reach the same lock decision for the same email.

#### Scenario: Lock survives a restart

- **WHEN** an email is locked and the service is restarted before the duration elapses
- **THEN** attempts for that email are still refused as locked

#### Scenario: Progress toward a lock survives a restart

- **WHEN** an email accumulates failures below the threshold and the service is restarted within the window
- **THEN** those failures still count, and the remaining attempts before locking are unchanged

#### Scenario: Replicas agree

- **WHEN** failed attempts for one email are spread across more than one replica of the service
- **THEN** they count toward a single shared threshold, and the resulting lock applies at every replica
