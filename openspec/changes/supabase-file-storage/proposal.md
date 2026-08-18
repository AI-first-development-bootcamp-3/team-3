## Why

Local filesystem storage is ephemeral in containerized environments and limits scalability. Supabase Storage provides durable, scalable file persistence with built-in backup and CDN capabilities, making it ideal for production Absence documents that must survive deployments and handle growth.

## What Changes

- Introduce Supabase Storage adapter as the new file storage backend for Absence documents
- Add three new environment variables to configure Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`)
- Update `.env.example` with Supabase configuration placeholders
- Create new storage service (`supabaseFileStorage`) implementing the same interface as `localFileStorage`
- Switch attachment upload/retrieval to use Supabase Storage via the new adapter
- Attachment metadata schema remains unchanged; only the storage backend changes

## Capabilities

### New Capabilities
- `absence/file-storage-supabase`: Supabase Storage adapter for persisting Absence documents with full durability and scalability

### Modified Capabilities
- None — API contracts and database schema remain unchanged

## Impact

- **Code**: New file: `backend/src/services/supabaseFileStorage.ts`. Modified: `backend/src/config/env.ts` (add Supabase env vars), `backend/src/services/attachment.service.ts` (switch storage backend)
- **Infrastructure**: Requires Supabase project with Storage bucket configured
- **Database**: No schema changes; works with existing Prisma Attachment model
- **APIs**: No breaking changes; `/attachments` and `/absences` routes remain identical
- **Environments**: Affects all environments (dev, staging, prod) — requires Supabase setup in each
