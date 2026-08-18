# Supabase Credentials Quick Start

## Getting Your Supabase Credentials

### 1. Access Supabase Dashboard

1. Go to https://app.supabase.com/
2. Sign in with your Supabase account
3. Select your project from the list

### 2. Navigate to API Settings

1. Click **Settings** (⚙️ icon) in the left sidebar
2. Click **API** in the submenu
3. You should see the API keys section

### 3. Copy Your Credentials

You need three values:

| Variable | Source | Description |
|----------|--------|-------------|
| `SUPABASE_URL` | **Project URL** at top of API page | Your Supabase project endpoint |
| `SUPABASE_ANON_KEY` | **anon public key** (shorter key) | Public key for client-side (not used in backend) |
| `SUPABASE_SERVICE_KEY` | **service_role secret** (longer key) | Secret key for backend use only ⚠️ |

**Example API page:**
```
Project URL:
https://abc123def456.supabase.co

anon public:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

service_role secret:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Add to Your .env File

```bash
# Backend directory: team-3/backend/.env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-secret-here
```

### 5. Verify Configuration

Run the backend:
```bash
cd team-3/backend
npm install
npm run dev
```

If credentials are correct, you should see no errors about SUPABASE_* variables.

## Important Security Notes

⚠️ **The `SUPABASE_SERVICE_KEY` is a secret:**
- Never commit `.env` to git
- Never share it in Slack, email, or Discord
- It grants full database and storage access
- Use your deployment platform's secret management

✅ **To safely deploy:**
- Docker Compose: Mount `.env` from a volume (not in git)
- Kubernetes: Use Secrets manifest
- Heroku/Railway: Set in dashboard environment variables
- AWS: Use Secrets Manager
- GitHub Actions: Use repository secrets

## Troubleshooting

### "SUPABASE_URL is required" error

**Problem:** The environment variable is not set or is empty.

**Solution:**
1. Check `.env` file exists and has `SUPABASE_URL=...`
2. Verify the value is not wrapped in quotes: ✓ `https://...` vs ✗ `"https://..."`
3. Restart the backend after editing `.env`

### "Invalid SUPABASE_SERVICE_KEY" error

**Problem:** The key is malformed or incomplete.

**Solution:**
1. Copy the **entire** service_role secret from Supabase dashboard
2. Ensure there are no extra spaces before or after
3. Ensure there are no line breaks or partial text

### Backend starts but file uploads fail

**Problem:** Backend can start (credentials are valid) but file operations fail.

**Solution:**
1. Verify the `absence-documents` bucket exists in Supabase Storage
2. Check Supabase project logs for API errors
3. Ensure your Supabase account is not suspended/inactive

## Next Steps

1. Add credentials to your `.env` file
2. Start the backend: `npm run dev`
3. Test file upload: `curl -X POST http://localhost:3000/attachments ...`
4. See `SUPABASE_DEPLOYMENT.md` for full deployment instructions

---

**Questions?** See `SUPABASE_DEPLOYMENT.md` for comprehensive setup guide.
