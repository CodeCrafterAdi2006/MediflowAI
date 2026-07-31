# MediFlow AI — Production Deployment Plan
## Authentication + Routing to Vercel

**Branch:** `authentication`  
**Target:** `https://mediflow-ai-kappa.vercel.app`  
**Date written:** 2026-07-31

---

## What This Deploys

Everything implemented in the `authentication` branch:

| Feature | What it does |
|---------|-------------|
| Google OAuth 2.0 + PKCE | Server-side login flow via `/api/auth/google/*` |
| JWT session cookies | Stateless 30-day `auth_token` HttpOnly cookie |
| `requireAuth` middleware | Protects all API routes that need identity |
| Supabase `users` table upsert | Stores Google profile on every login |
| `AuthContext` + `ProtectedRoute` | Client-side session management + route guarding |
| Landing page as entry point | `/` → LandingPage → "Get Started" → login flow |
| `GetStartedButton` | Auth-aware CTA (guest → `/login`, authed → `/app/dashboard`) |
| Logout from anywhere | All logout flows land on `/` (landing page) |
| Auth-aware `Navbar` | Shows "Log out" instead of "Get Started" for logged-in visitors |

---

## Architecture Reminder (Vercel)

```
Vercel Project (mediflow-ai-kappa.vercel.app)
│
├── /api/(*)  ──────── api/index.ts ──► server/src/index.ts (Express)
│                                                │
│                                      ┌─────────┴──────────┐
│                                  /api/auth/*         /api/prescriptions/*
│                                  /api/schedule/*
│
└── /(non-api)  ─────── client/dist/index.html  (React SPA)
```

**Key constraint:** Vercel serverless functions are stateless — no in-memory store between invocations. The JWT cookie architecture was specifically chosen to work around this (see `docs/auth-implementation-plan.md §3`).

---

## Phase 1 — Pre-Flight Checklist (Before Touching Anything)

Complete all items before moving to Phase 2.

- [ ] Confirm you are on the `authentication` branch: `git branch`
- [ ] Confirm local dev is working end-to-end (login → dashboard → logout → landing)
- [ ] Confirm no uncommitted changes that shouldn't go to production: `git status`
- [ ] Have access to:
  - [ ] Google Cloud Console (the MediflowAI project)
  - [ ] Supabase Dashboard (the production project)
  - [ ] Vercel Dashboard (the `mediflow-ai-kappa` project)

> [!CAUTION]
> Do **not** merge to `main` until all phases below are complete and verified. A broken auth flow on production will lock all users out.

---

## Phase 2 — Supabase: Run the Users Table Migration

The `upsertUser` task (called on every login) writes to a `users` table. **If this table doesn't exist on the production Supabase project, every login will fail with a 500 error.**

### Step 2.1 — Check if the table already exists

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your MediFlow project
3. Left sidebar → **Table Editor**
4. Look for a table named `users`

**If it exists:** skip to Phase 3.  
**If it does not exist:** continue with Step 2.2.

### Step 2.2 — Run the migration SQL

1. Left sidebar → **SQL Editor**
2. Click **New query**
3. Paste the following and click **Run**:

```sql
-- Create users table for Google OAuth profiles
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id     TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  picture       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by google_id (used on every login)
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users (google_id);

-- Row Level Security: service-role key bypasses RLS — block anon access.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.users
  FOR ALL USING (false);
```

4. Confirm output: `Success. No rows returned.`

> [!IMPORTANT]
> The `supabaseAdmin` client in the server uses the **service-role key**, which bypasses RLS. This is intentional and correct for server-to-server operations. Do NOT use the anon key for auth operations.

---

## Phase 3 — Google Cloud Console: Register Production Redirect URI

Google OAuth requires the **exact** redirect URI to be registered. Vercel's production URL must be added.

### Step 3.1 — Open the OAuth credential

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Select the **MediflowAI** project
3. Left sidebar → **APIs & Services → Credentials**
4. Click the **OAuth 2.0 Client ID** named `MediflowAI Web` (or similar)

### Step 3.2 — Check existing URIs

Under **Authorized redirect URIs**, verify these are present:

```
http://localhost:5000/api/auth/google/callback
https://mediflow-ai-kappa.vercel.app/api/auth/google/callback
```

**If the production URI is missing:**
1. Click **+ Add URI**
2. Paste: `https://mediflow-ai-kappa.vercel.app/api/auth/google/callback`
3. Click **Save**

> [!WARNING]
> Google propagates credential changes within a few minutes but occasionally up to 5 minutes. Wait before testing after saving.

### Step 3.3 — Confirm Authorized JavaScript Origins

Also verify under **Authorized JavaScript origins**:
```
http://localhost:5173
http://localhost:5000
https://mediflow-ai-kappa.vercel.app
```

Add any missing ones and Save.

---

## Phase 4 — Vercel: Set Environment Variables

All secrets must be set as Vercel environment variables. **Never commit real secrets to git.**

### Step 4.1 — Open the Vercel project

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Open the **MediflowAI** project
3. Click **Settings → Environment Variables**

### Step 4.2 — Set each variable

| Variable | Environment | Value | How to get it |
|----------|-------------|-------|---------------|
| `GOOGLE_CLIENT_ID` | Production + Preview | `xxx.apps.googleusercontent.com` | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | **Production only** | `GOCSPX-xxx...` | Same OAuth client |
| `GOOGLE_REDIRECT_URI` | **Production only** | `https://mediflow-ai-kappa.vercel.app/api/auth/google/callback` | Must match exactly what's in Google Cloud |
| `JWT_SECRET` | Production + Preview | 64-char hex string | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Production + Preview | `30d` | Literal string |
| `CLIENT_URL` | **Production only** | `https://mediflow-ai-kappa.vercel.app` | Your Vercel app URL (no trailing slash) |
| `SUPABASE_URL` | Production + Preview | `https://xxxxx.supabase.co` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production only** | `eyJ...` | Supabase → Project Settings → API → service_role |
| `NODE_ENV` | **Production only** | `production` | Enables `Secure` cookie flag |

> [!CAUTION]
> **Generate a brand-new `JWT_SECRET` for production.** Do NOT reuse your local dev secret. If you lose the production secret, all existing sessions become invalid and all users are logged out.

> [!IMPORTANT]
> **Do NOT set `GOOGLE_REDIRECT_URI` for Preview deployments.** Preview deploys get unpredictable URLs that Google won't accept. Login on previews will not work — this is expected and documented.

### Step 4.3 — Existing variables (verify still present)

| Variable | Notes |
|----------|-------|
| `GEMINI_API_KEYS` | LLM integration |
| `GROQ_API_KEYS` | LLM integration |
| `OPENROUTER_API_KEYS` | LLM integration |
| `VITE_API_URL` | Should be empty or unset (same-origin on Vercel) |

---

## Phase 5 — Git: Merge and Deploy

### Step 5.1 — Final commit on `authentication` branch

```bash
git status               # should be clean
git add .
git commit -m "feat(auth): complete Google OAuth + routing implementation"
git push origin authentication
```

### Step 5.2 — Open a Pull Request

On GitHub: open a PR from `authentication` → `main`.

### Step 5.3 — Review the PR diff

Confirm the diff includes **only** the expected files:

**New files:**
- `client/src/components/GetStartedButton.jsx`
- `client/src/components/ProtectedRoute.jsx`
- `client/src/context/AuthContext.jsx`
- `client/src/pages/LoginPage.jsx` + `LoginPage.css`
- `server/src/routes/auth.ts`
- `server/src/lib/jwt.ts`
- `server/src/middleware/requireAuth.ts`
- `server/src/tasks/upsertUser.ts`
- `docs/auth-implementation-plan.md`
- `docs/routing-and-entry-points.md`
- `docs/production-deployment-plan.md`
- `task_plan.md`
- `vulnerabilities.md`

**Modified files:**
- `client/src/App.tsx`
- `client/src/app/AppLayout.jsx` + `AppLayout.css`
- `client/index.html`
- `server/src/index.ts`
- `.env.example`

### Step 5.4 — Merge and watch the Vercel build

1. Merge the PR → Vercel auto-deploys
2. Vercel Dashboard → **Deployments** → watch the build log
3. The build script runs: `server npm install + build` then `client npm install + build`
4. Build should complete in ~2–3 minutes

> [!WARNING]
> If the build fails, check the Vercel build log first. Common causes:
> - TypeScript compile error in server code
> - Missing packages: `cookie-parser`, `jsonwebtoken`, `google-auth-library`, `express-rate-limit` (these should be in `server/package.json`)
> - Vite build errors from JSX components

---

## Phase 6 — Smoke Testing on Production

Run all tests in a **private/incognito browser window** (ensures no cached cookies from dev).

| # | Test | Steps | Expected Result |
|---|------|-------|----------------|
| 1 | Landing page | Visit `https://mediflow-ai-kappa.vercel.app` | LandingPage renders; Navbar shows "Get Started" |
| 2 | Health check | Visit `/health` | `{ "status": "ok", "timestamp": "..." }` |
| 3 | Route guard | Paste `/app/dashboard` in URL | Redirected to `/` (LandingPage) |
| 4 | Login flow | Click "Get Started" → "Continue with Google" | Google consent screen opens |
| 5 | OAuth callback | Complete Google sign-in | Redirected to `/app/dashboard`; avatar shows in nav |
| 6 | Session persists | Refresh `/app/dashboard` | Still logged in (cookie restored) |
| 7 | Authed "Get Started" | Visit `/`, click any "Get Started" | Goes directly to `/app/dashboard` |
| 8 | Logout | Click "Log out" from any `/app/*` page | Cookie cleared; redirected to `/` |
| 9 | Supabase write | After Test 5, check Supabase → Table Editor → `users` | Row with your Google profile exists |

All 9 must pass before the deployment is considered complete.

---

## Rollback Plan

If anything goes wrong after merging:

### Option A — Vercel instant rollback (fastest, no git required)

1. Vercel Dashboard → **Deployments**
2. Find the last working deployment
3. Click **⋯ → Promote to Production**

This rolls back the live site in ~30 seconds without touching git.

### Option B — Git revert

```bash
git revert -m 1 <merge-commit-hash>
git push origin main
```

Vercel auto-deploys the reverted state.

---

## Time Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | Pre-flight checklist | 5 min |
| 2 | Supabase migration | 5 min |
| 3 | Google Cloud Console | 5 min |
| 4 | Vercel env vars | 10 min |
| 5 | Merge + deploy | 5 min |
| 6 | Smoke testing | 10 min |
| **Total** | | **~40 min** |

---

*Architecture reference: [`docs/auth-implementation-plan.md`](./auth-implementation-plan.md)*  
*Routing reference: [`docs/routing-and-entry-points.md`](./routing-and-entry-points.md)*
