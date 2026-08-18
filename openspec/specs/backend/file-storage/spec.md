# backend/file-storage Specification

## Purpose
Defines how supporting documents for absence reports — sick notes and reserve-duty confirmations — are uploaded, stored, and retrieved, with file bytes held outside the database so that backups, memory use, and hosting storage limits stay manageable.
## Requirements
### Requirement: Constrained file upload

The service SHALL accept file uploads only within declared limits on file size and content type, rejecting anything outside them before the file is persisted.

#### Scenario: Permitted file is accepted

- **WHEN** a caller uploads a PDF or image within the configured size limit
- **THEN** the file is stored
- **AND** the response returns an identifier for later retrieval

#### Scenario: Oversized file is refused

- **WHEN** a caller uploads a file exceeding the configured size limit
- **THEN** the service responds `413` using the standard error contract
- **AND** no partial file is retained

#### Scenario: Disallowed content type is refused

- **WHEN** a caller uploads a file whose type is not in the permitted set
- **THEN** the service responds `400`
- **AND** the file is not stored

#### Scenario: Uploads require authentication

- **WHEN** an unauthenticated caller attempts an upload
- **THEN** the service responds `401` and stores nothing

### Requirement: Metadata and content separation

File metadata SHALL be recorded in the database while file bytes are held in a separate store. The storage mechanism SHALL sit behind an interface so that the backing store can be replaced without changing calling code.

#### Scenario: Metadata is queryable

- **WHEN** a file has been uploaded
- **THEN** its original filename, content type, size, and upload timestamp are recorded in the database
- **AND** a reference locating the stored bytes is recorded alongside them

#### Scenario: Bytes are not stored in the database

- **WHEN** file storage is inspected
- **THEN** the database holds no file contents, only metadata and a reference

#### Scenario: Backing store is replaceable

- **WHEN** the storage implementation is swapped for a different backing store
- **THEN** no calling code requires modification

### Requirement: Controlled file retrieval

Stored files SHALL be retrievable only by callers entitled to see them. A caller SHALL be able to retrieve their own attachments; an administrator SHALL be able to retrieve any.

#### Scenario: Owner retrieves their attachment

- **WHEN** an authenticated caller requests an attachment they uploaded
- **THEN** the file is returned with its recorded content type

#### Scenario: Administrator retrieves any attachment

- **WHEN** an administrator requests any stored attachment
- **THEN** the file is returned

#### Scenario: Unrelated employee is refused

- **WHEN** a regular employee requests an attachment uploaded by a different employee
- **THEN** the service responds `403` and the file is not returned

#### Scenario: Missing file

- **WHEN** a caller requests an identifier that does not exist
- **THEN** the service responds `404` using the standard error contract

#### Scenario: Stored names cannot escape the store

- **WHEN** an uploaded filename contains path traversal sequences
- **THEN** the stored reference is sanitised so that reads and writes stay within the configured store

