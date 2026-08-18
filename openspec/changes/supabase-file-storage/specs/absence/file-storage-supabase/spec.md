## Purpose

Persists Absence documents in Supabase Storage with durable file retention, supporting production-grade scalability and backup for Absence records.

## ADDED Requirements

### Requirement: Upload file to Supabase Storage
The system SHALL store uploaded Absence documents in Supabase Storage with a unique identifier and preserve file metadata (name, content type, size).

#### Scenario: Successful file upload
- **WHEN** a user uploads a file via POST /attachments
- **THEN** the file is stored in Supabase Storage, and metadata is recorded in the database with a unique storage key

#### Scenario: File metadata persisted
- **WHEN** a file is uploaded
- **THEN** the system records filename, MIME type, size in bytes, and uploader ID in the attachments table

### Requirement: Retrieve file from Supabase Storage
The system SHALL retrieve Absence documents from Supabase Storage by their storage key and stream them to authorized users with the correct content type.

#### Scenario: Successful file retrieval
- **WHEN** an authorized user requests a file via GET /attachments/{id}
- **THEN** the file is streamed from Supabase Storage with the correct Content-Type and Content-Disposition headers

#### Scenario: Authorization check for retrieval
- **WHEN** a user attempts to retrieve a file
- **THEN** access is granted only if the user is the uploader, the absence owner, or an administrator; otherwise return 403 Forbidden

### Requirement: Supabase configuration
The system SHALL read Supabase credentials from environment variables and use them to initialize the storage client.

#### Scenario: Credentials loaded at startup
- **WHEN** the backend service starts
- **THEN** SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_KEY are loaded from environment variables

#### Scenario: Invalid credentials rejected
- **WHEN** Supabase credentials are missing or invalid
- **THEN** the service fails to start with a clear error message indicating which credential is misconfigured

### Requirement: Link files to Absences
The system SHALL allow uploaded files to be associated with Absence records via the attachment absenceId field, maintaining referential integrity.

#### Scenario: File linked to Absence on creation
- **WHEN** a user creates an Absence with attachmentIds
- **THEN** those files are linked to the Absence record, and both the uploader and absence owner can retrieve them

#### Scenario: Orphaned files remain accessible to uploader
- **WHEN** a file is uploaded but not linked to an Absence
- **THEN** only the uploader can access it until it is linked to an Absence or an administrator accesses it

### Requirement: Error handling
The system SHALL handle Supabase storage errors gracefully and return appropriate HTTP status codes.

#### Scenario: File too large
- **WHEN** a user uploads a file exceeding the size limit
- **THEN** the system returns 413 Payload Too Large with a descriptive error message

#### Scenario: Supabase service unavailable
- **WHEN** Supabase Storage is temporarily unavailable during upload
- **THEN** the system returns 500 Internal Server Error with details about the storage failure
