# Hosting on Railway

The app is a Vite SPA plus an Express API. Railway runs them as two services
in one project, with Railway Postgres. Deploys track **`main`**.

This file is the dashboard walkthrough. Config lives in `backend/railway.toml`
and `frontend/railway.toml`. GitHub Actions only runs CI — it does not deploy.

## 1. Create the project

1. Open [railway.com/new](https://railway.com/new) and sign in with GitHub.
2. Choose **Empty project** (not “Deploy from GitHub”). A root-level import
   would look for a Dockerfile at the repo root and miss both apps.
3. Right-click the canvas → **Add Database** → **PostgreSQL**. Leave the
   default name (`Postgres`).

## 2. Backend service

1. **Add Service** → **GitHub Repo** → `AI-first-development-bootcamp-3/team-3`.
2. Rename the service to `backend`.
3. **Settings**:
   - **Root Directory:** `/backend`
   - **Config-as-code path:** `/backend/railway.toml`
   - **Branch:** `main`
4. **Networking** → **Generate Domain**. Copy the URL
   (`https://….up.railway.app`, no trailing slash). That is the API origin.
5. **Variables** (shared / service):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Variable reference → `Postgres` → `DATABASE_URL` (private, not `DATABASE_PUBLIC_URL`) |
   | `NODE_ENV` | `production` |
   | `TRUST_PROXY` | `true` |
   | `JWT_SECRET` | 32+ random characters (see below) |
   | `CORS_ORIGIN` | the **frontend** public URL from step 3 (placeholder `https://example.invalid` until that domain exists, then update) |

   Do not set `PORT`. Railway injects it.

   Generate a secret in PowerShell:

   ```powershell
   -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
   ```

## 3. Frontend service

1. **Add Service** → **GitHub Repo** → the same `team-3` repo.
2. Rename the service to `frontend`.
3. **Settings**:
   - **Root Directory:** `/frontend`
   - **Config-as-code path:** `/frontend/railway.toml`
   - **Branch:** `main`
4. **Variables**:

   | Name | Value |
   | --- | --- |
   | `VITE_API_URL` | the **backend** public URL from step 2, no trailing slash |

   `VITE_API_URL` is a **build** argument. Changing it later requires a
   frontend **Rebuild**. The browser talks to this URL; do not use Railway’s
   private `*.railway.internal` hostname.
5. **Networking** → **Generate Domain**. Copy the URL (no trailing slash).
6. Go back to **backend** → **Variables** and set `CORS_ORIGIN` to that
   frontend URL exactly (`https://….up.railway.app`). Redeploy backend if it
   already started with the placeholder.

## 4. First deploy order

1. Wait until Postgres is running.
2. Deploy **backend** (migrations run on pre-deploy and again on boot).
3. Hit `https://<backend>/health` — expect `{"status":"ok"}`.
4. Deploy **frontend** after `VITE_API_URL` is set.
5. Open the frontend URL and log in.

## 5. Seed demo users (once)

The seed is **not** part of deploy. From your machine, with the backend
folder and Railway’s **public** Postgres URL (`Postgres` → `DATABASE_PUBLIC_URL`):

```powershell
cd backend
$env:DATABASE_URL = "paste DATABASE_PUBLIC_URL here"
npx prisma migrate deploy
npm run seed
```

Seed accounts use password `password123` (see `backend/README.md`). Restrict
who you send the live URL to — this is a demo dataset, not a hardened tenant.

If `migrate deploy` complains about SSL, append `?sslmode=require` to the URL
(or `&sslmode=require` if it already has a query string).

## 6. After a merge to `main`

Railway rebuilds the service whose watch paths changed (`/backend/**` or
`/frontend/**`). A frontend rebuild is required whenever `VITE_API_URL` changes.

Absence document upload still needs real `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`
on the backend service. Until those are set, the rest of the app should run;
uploads will fail.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Frontend nginx crash / “bind to 80” | `PORT` not substituted — confirm the production image uses `nginx.conf` as a template (this repo) |
| Login appears to work, then you bounce to login | `CORS_ORIGIN` mismatch, or frontend built with the wrong `VITE_API_URL` |
| `GET /health` is 503 | `DATABASE_URL` not referenced, or Postgres still provisioning |
| Build uses Nixpacks / Railpack | Root Directory is empty — must be `/backend` or `/frontend` |
| Browser blocks the cookie | Production sets `SameSite=None; Secure` for split Railway domains; the API must be `https://` |
