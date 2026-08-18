# Supabase File Storage Deployment Checklist

This document outlines the steps required to deploy Supabase file storage for Absence documents.

## Prerequisites

- Active Supabase account and project
- Access to Supabase project settings and API keys
- Backend deployed to staging/production environment

## 1. Supabase Project Setup

### Create Storage Bucket

1. Go to your Supabase project dashboard: https://app.supabase.com/
2. Navigate to **Storage** → **Buckets**
3. Click **New Bucket**
4. Configure:
   - **Bucket name:** `absence-documents`
   - **Public bucket:** Disabled (Private access only)
   - **File size limit:** 5 MB (default)
5. Click **Create Bucket**

### Enable Versioning (Optional but Recommended)

1. Click the bucket name `absence-documents`
2. Go to **Settings** tab
3. Enable **File Versioning** for audit trail support
4. Save changes

### Configure Access Policies

Supabase Storage will use the service-key authentication model (server-side only):

1. No RLS policies needed (service key bypasses them)
2. Access control is enforced at the API layer in the backend
3. Users cannot directly access Supabase Storage; all requests go through the backend

## 2. Environment Configuration

### Retrieve API Credentials

1. Go to Supabase project **Settings** → **API**
2. Copy the following values:
   - **Project URL:** `https://<project-id>.supabase.co`
   - **anon public key:** (starts with `eyJ...`)
   - **service_role secret:** (starts with `eyJ...` and is the longest string)

### Add to Environment Files

For **development** (.env):
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_KEY=your-service-role-secret
```

For **staging** (deployment secrets):
```
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_KEY=<staging-service-role-secret>
```

For **production** (deployment secrets):
```
SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_KEY=<production-service-role-secret>
```

⚠️ **CRITICAL:** Never commit `.env` files. Use your deployment platform's secret management:
- Docker Compose: Use `.env` in Docker context (not committed)
- Kubernetes: Use Secrets
- AWS/GCP/Azure: Use their respective secret managers
- Heroku/Railway: Use environment variables in dashboard

## 3. Deployment Steps

### Step 1: Verify Backend Configuration

```bash
# Backend directory
cd team-3/backend

# Check that environment variables are loaded correctly
npm run build  # Compile TypeScript
```

### Step 2: Test Supabase Connectivity

Before deploying to production:

```bash
# Run with Supabase test credentials
npm test -- attachment.routes.test.ts
```

Expected: Tests should execute (may fail without real Supabase, but should compile)

### Step 3: Deploy Backend

Deploy your backend with Supabase credentials configured:

```bash
# Example for Docker Compose
docker compose up --build

# Or for your deployment platform:
git push <your-remote> <branch>
```

### Step 4: Verify Deployment

1. Check backend logs for startup errors:
   ```
   SUPABASE_URL: <value>
   SUPABASE_ANON_KEY: <value>
   SUPABASE_SERVICE_KEY: <value>
   ```

2. Test file upload endpoint:
   ```bash
   curl -X POST http://localhost:3000/attachments \
     -H "Authorization: Bearer <test-token>" \
     -F "file=@test.pdf"
   ```

3. Verify file appears in Supabase dashboard under Storage → absence-documents

## 4. Security Checklist

- [ ] SUPABASE_SERVICE_KEY is never committed to git
- [ ] Service key is only used by the backend (never exposed to frontend)
- [ ] API authentication is enforced on all endpoints
- [ ] Absence owner + uploader authorization checks are in place
- [ ] Storage bucket is set to Private (not Public)
- [ ] Rate limiting is configured on attachment endpoints
- [ ] Supabase project has no default public access policies

## 5. Monitoring & Maintenance

### Monitor Storage Usage

1. Go to Supabase dashboard → **Usage**
2. Check Storage quota
3. Set up billing alerts if on free tier

### Monitor Access Patterns

1. Supabase **Logs** → **Storage** to see file access patterns
2. Review access logs in production weekly
3. Report any unusual access patterns to security team

### Backup Strategy

Supabase automatically backs up your data:
- Backups retained for 7 days (free tier)
- Daily backups available (Pro tier)
- Enable Point-in-Time Recovery (Pro tier) for file versioning

## 6. Troubleshooting

### Error: "Invalid SUPABASE_SERVICE_KEY"

**Solution:** Verify the key is copied completely without extra spaces or line breaks.

### Error: "Bucket not found"

**Solution:** Ensure bucket name is exactly `absence-documents` (case-sensitive).

### Uploads succeed but retrievals fail with 404

**Solution:** 
1. Check bucket exists in Supabase dashboard
2. Verify service key has permission to read from bucket
3. Check backend logs for Supabase API errors

### High latency on file operations

**Solution:**
1. Ensure backend and Supabase project are in the same region
2. Consider CDN setup for frequently accessed files (advanced)

## 7. Migration from Local Storage

If migrating from local filesystem storage:

1. Keep local files in place for a transition period
2. Gradually migrate new uploads to Supabase
3. Create a migration script for existing files (deferred task)
4. Verify all files are accessible before removing local storage

See `openspec/changes/supabase-file-storage/tasks.md` (Task 7.1) for migration details.

---

**Deployment Completion:** Once all checks above pass, file storage for Absence documents is live on Supabase.
