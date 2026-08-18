## Context

Currently, Absence documents are persisted via `localFileStorage` abstraction that writes to a mounted filesystem (`STORAGE_DIR`). The attachment service treats the storage backend as pluggable, with only two entry points: `store(filename, content)` and `retrieve(storageKey)`. The Prisma schema stores metadata (Attachment rows) separately from file bytes.

## Goals / Non-Goals

**Goals:**
- Provide durable file storage that survives container restarts and is suitable for production
- Maintain the existing storage abstraction interface so attachment.service.ts requires minimal changes
- Support secure access control (uploader + absence owner can retrieve; others blocked at API layer)
- Add environment-based configuration so Supabase credentials are external, not hardcoded

**Non-Goals:**
- Direct client-side uploads to Supabase (no presigned URLs in this phase)
- Automatic migration of existing files from local storage to Supabase
- Custom IAM policies or row-level security in Supabase beyond the service-key model
- Changes to the Attachment schema or API contracts

## Decisions

### 1. Storage Adapter Interface (Same as localFileStorage)
**Decision:** Implement `supabaseFileStorage` with the same interface as `localFileStorage` — `store(filename, content): Promise<storageKey>` and `retrieve(storageKey): Promise<Readable>`.

**Rationale:**
- Minimizes changes to `attachment.service.ts`
- Keeps the abstraction clean and testable
- Allows future swaps without touching service logic

**Alternatives Considered:**
- Refactoring the storage interface: More flexible but requires changes throughout the service layer
- Direct Supabase SDK integration in attachment.service.ts: Tighter coupling, harder to test

### 2. Storage Key Strategy
**Decision:** Use Supabase file path (e.g., `absences/user-id/uuid.ext`) as the storageKey stored in the Attachment row.

**Rationale:**
- Path is deterministic and human-readable for debugging
- Supabase API returns the path on upload, so no separate key mapping needed
- Fits naturally into Supabase's filesystem model

**Alternatives Considered:**
- UUID + separate mapping table: More indirection, no benefit here
- Random suffix only: Less debuggable, requires tracking original filename separately

### 3. Bucket Organization
**Decision:** Use a single bucket `absence-documents` with paths like `{userId}/{attachmentId}` to organize by uploader.

**Rationale:**
- Logical separation for access logs and potential future retention policies
- Avoids name collisions across users
- Simple to explain and audit

**Alternatives Considered:**
- One bucket per environment (dev, staging, prod): More complex configuration
- Flat structure with UUID only: Harder to audit and filter by user

### 4. Authentication Method
**Decision:** Use `SUPABASE_SERVICE_KEY` (server-only, admin-level credentials) for all backend operations.

**Rationale:**
- Backend already has secrets management via environment variables
- Service key bypasses Supabase RLS policies, simplifying operations
- Access control remains in the application layer (who can call the API endpoint)
- No need to manage per-user or per-session keys

**Alternatives Considered:**
- Anon key + Supabase RLS policies: More complex, duplicates authorization logic already in the API
- Direct database queries + RLS: Tighter coupling to Supabase's authorization model

### 5. Error Handling Strategy
**Decision:** Wrap Supabase SDK errors and re-throw as `AppError` (following existing error handling pattern).

**Rationale:**
- Consistent error responses across the application
- Hides Supabase-specific error details from the client
- Allows graceful fallback if needed later

**Alternatives Considered:**
- Pass through Supabase errors directly: Exposes implementation details
- Silent retry logic: Delays timeout and complicates failure diagnosis

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Supabase credentials leak in logs or error messages | Validate credentials at startup; never log actual key values; use Supabase's audit log to track access |
| Bucket misconfiguration (wrong permissions) | Document bucket setup in a deployment checklist; validate access in integration tests |
| Network latency to Supabase (slower uploads/downloads) | Supabase is geographically close for most users; latency is ~50ms; if unacceptable, revisit CDN or caching |
| No automatic migration of existing local files | Users see old files disappear until migrated manually; provide a migration script as future work |
| Cost scaling with file storage | Monitor Supabase pricing; consider retention policies if storage grows beyond budget |

## Migration Plan

1. **Deploy infrastructure**: Create Supabase bucket `absence-documents` with default ACLs (private, service-key-only access)
2. **Environment setup**: Add Supabase credentials to `.env` and `.env.example` in dev, staging, and production
3. **Code deployment**: Roll out backend changes (new supabaseFileStorage, updated env.ts, swapped attachment.service.ts)
4. **Validation**: Test file upload/download with a sample Absence record
5. **Rollback**: If issues arise, revert to localFileStorage by changing the import in attachment.service.ts (no database changes)

## Open Questions

- Should we implement an automatic migration script to copy existing files from local storage to Supabase, or handle it manually during first deployment?
- Do we need retention policies or lifecycle rules for old Absence documents in Supabase?
- Should billing alerts or storage quotas be configured in Supabase project settings?
