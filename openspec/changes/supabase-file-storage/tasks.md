## 1. Setup & Dependencies

- [x] 1.1 Install Supabase JavaScript client: `npm install @supabase/supabase-js` in backend
- [x] 1.2 Verify TypeScript types are included (should come with the package)

## 2. Environment Configuration

- [x] 2.1 Update `backend/src/config/env.ts` to add Supabase environment variables:
  - `SUPABASE_URL` (required)
  - `SUPABASE_ANON_KEY` (required)
  - `SUPABASE_SERVICE_KEY` (required)
- [x] 2.2 Add Zod validation for the new environment variables (ensure they are non-empty strings)
- [x] 2.3 Update `.env.example` with Supabase configuration placeholders and comments explaining where to find them

## 3. Create Supabase Storage Adapter

- [x] 3.1 Create new file: `backend/src/services/supabaseFileStorage.ts` implementing the storage interface:
  - `store(filename: string, content: Buffer): Promise<storageKey: string>` — upload to Supabase
  - `retrieve(storageKey: string): Promise<Readable>` — download as stream
- [x] 3.2 Initialize Supabase client in the adapter using credentials from env.ts
- [x] 3.3 Implement `store` method:
  - Generate storage path: `absences/{userId}/{attachmentId}` (attachmentId is a UUID)
  - Upload file to `absence-documents` bucket
  - Return the path as storageKey
  - Handle upload errors gracefully
- [x] 3.4 Implement `retrieve` method:
  - Download file from `absence-documents` bucket using storageKey
  - Return as a Readable stream
  - Handle missing file (404) and permission errors gracefully
- [x] 3.5 Add error handling to convert Supabase errors to AppError for consistency

## 4. Update Attachment Service

- [x] 4.1 Update `backend/src/services/attachment.service.ts`:
  - Import `supabaseFileStorage` instead of `localFileStorage`
  - Change `uploadAttachment` to use `supabaseFileStorage.store()` instead of `localFileStorage.store()`
  - Change `retrieveAttachment` to use `supabaseFileStorage.retrieve()` instead of `localFileStorage.retrieve()`
- [x] 4.2 Verify authorization logic remains unchanged (uploader + absence owner + admin checks still work)

## 5. Testing & Validation

- [x] 5.1 Create integration test: upload a file via POST /attachments and verify it's stored in Supabase
- [x] 5.2 Create integration test: retrieve a file via GET /attachments/{id} and verify content matches
- [x] 5.3 Create integration test: verify unauthorized users cannot retrieve files (403 Forbidden)
- [x] 5.4 Create integration test: verify uploading to a non-existent Absence still works (orphaned file)
- [x] 5.5 Manual test: create an Absence with attachmentIds and verify files are accessible via the Absence owner context
- [x] 5.6 Manual test: verify error handling for network failures and missing Supabase credentials

## 6. Deployment & Documentation

- [x] 6.1 Create a deployment checklist documenting Supabase bucket setup:
  - Bucket name: `absence-documents`
  - Access level: Private (no public access)
  - Enable versioning (optional, for audit trail)
- [x] 6.2 Document how to retrieve Supabase credentials from the Supabase dashboard and add to `.env`
- [x] 6.3 Update backend README with note about Supabase dependency and required environment setup
- [x] 6.4 Verify backward compatibility: ensure the change doesn't break existing absence or attachment APIs

## 7. Cleanup (Optional Future Work)

- [ ] 7.1 Consider implementing a migration script to copy existing local files to Supabase (deferred - add as a separate change)
- [ ] 7.2 Consider adding storage lifecycle policies in Supabase for old files (deferred - add when retention requirements are finalized)
