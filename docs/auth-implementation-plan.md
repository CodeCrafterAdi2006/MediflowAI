# MediflowAI — Google OAuth Authentication Implementation Plan

**Branch:** `authentication`
**Date:** 2026-07-28
**Author:** AI Engineering (pre-implementation plan — awaiting approval before any code is written)

---

## 1. Codebase Snapshot (What Exists Today)

| Layer | Technology | Key Facts Found |
|---|---|---|
| Frontend | React 19 + Vite 8 + React Router v7 + Tailwind CSS v4 + Lucide Icons | JSX files (`.jsx`), not `.tsx`. No TypeScript in frontend. |
| Backend | Express.js 4 + TypeScript (ESM, `"type":"module"`) + Supabase JS SDK | Two route files: `prescriptions.ts`, `schedule.ts`. No session middleware at all. |
| Database | Supabase (PostgreSQL via `@supabase/supabase-js`) | `supabaseAdmin` client exists with service-role key. **No `users` table** in any discovered schema. |
| Auth | **None.** Zero authentication, zero session handling, zero JWT code anywhere. | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are already placeholder-stubbed in `.env.example` with redirect URI `http://localhost:5000/api/auth/google/callback` — strongly suggests the intended pattern. |
| Deployment | Vercel (monorepo) | `vercel.json` at root rewrites `/api/(.*)` to serverless function at `api/index.ts`, which re-exports the Express `app`. All API calls go through one serverless function. |
| Routing | React Router v7 `BrowserRouter` | Routes: `/` (landing), `/app/upload`, `/app/review`, `/app/dashboard`, `/app/caregiver`, `/app/profile`. All `/app/*` routes are currently unprotected. |
| State | `MedicationContext` (React Context + localStorage) | No user identity in global state. `ProfilePage` has meal-time form but no auth connection. |

---

## 2. OAuth Flow Decision: Authorization Code Flow (Redirect-Based)

### Chosen: **Authorization Code Flow (server-side code exchange) + PKCE**

#### Why not Google Identity Services (GIS) popup / One Tap?

| Factor | GIS Popup/One Tap | Authorization Code (Chosen) |
|---|---|---|
| Secret exposure | `GOOGLE_CLIENT_SECRET` not needed on frontend for basic login | Secret stays on server (Vercel env var), never in client bundle |
| Refresh tokens | Not provided by GIS One Tap | Google returns `refresh_token` on first auth (with `access_type=offline`) |
| Serverless compatibility | Works but requires careful CSRF management on the frontend | PKCE (Proof Key for Code Exchange) eliminates state-secret management entirely |
| Existing `.env.example` hints | The existing stubs already include `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback` | Exactly matches redirect-based flow |
| Control / Customizability | Harder to intercept for custom session issuance | Full control: receive code, verify, create session token, set cookie |

**Decision: Authorization Code Flow + PKCE** — code exchanged server-side; stateless JWT issued as `HttpOnly` cookie.

---

## 3. Session Strategy: Stateless JWT in HttpOnly Cookie

### Why JWT over server-side sessions?

Vercel is **serverless**. Each API invocation may run in a different cold-started Lambda. This means:

- **No in-memory session stores** (`express-session` with `MemoryStore`) — they reset per invocation.
- **No Redis** or sticky sessions without a paid add-on service.
- Supabase could store sessions, but adds a DB round-trip latency to every authenticated request.

**JWT in `HttpOnly` cookie** is the correct choice:

- Self-contained: the server validates the signature on every request — no DB round trip needed for auth check.
- `HttpOnly` + `Secure` + `SameSite=Lax` prevents XSS and CSRF.
- `credentials: true` is already set in the Express CORS config, so cookies flow correctly.
- Token expiry is embedded in the JWT payload — no session store needed.

**JWT payload will contain:** `{ sub: googleId, email, name, picture, iat, exp }`
**JWT lifetime:** 30 days (configurable via `JWT_EXPIRES_IN`). No refresh token rotation at MVP — re-login after expiry.

---

## 4. Full Sequence Diagram (Step-by-Step)

```
Browser                     Express API (Vercel Serverless)       Google OAuth       Supabase DB
   |                                  |                                |                  |
   |-- Click "Continue with Google"   |                                |                  |
   |                                  |                                |                  |
   |   GET /api/auth/google/url        |                                |                  |
   |--------------------------------->|                                |                  |
   |   Generate PKCE code_verifier    |                                |                  |
   |   Store code_verifier in HttpOnly|                                |                  |
   |   cookie "pkce_verifier"         |                                |                  |
   |   Build Google auth URL with:    |                                |                  |
   |     client_id, redirect_uri,     |                                |                  |
   |     scope, response_type=code,   |                                |                  |
   |     code_challenge, S256         |                                |                  |
   |<-- 200 { url: "https://accounts.google.com/o/oauth2/auth?..." }  |                  |
   |                                  |                                |                  |
   |-- window.location.href = url     |                                |                  |
   |------------------------------------------------>  GET /o/oauth2/auth              |
   |                                  |   Google login & consent screen shown            |
   |<------------------------------------------------  302 redirect to REDIRECT_URI     |
   |   ?code=AUTH_CODE                |                                |                  |
   |                                  |                                |                  |
   |   GET /api/auth/google/callback?code=AUTH_CODE                    |                  |
   |--------------------------------->|                                |                  |
   |   Read pkce_verifier cookie      |                                |                  |
   |   POST oauth2.googleapis.com/token                               |                  |
   |   { code, code_verifier, client_id, client_secret, redirect_uri }|                  |
   |                                  |----POST /token---------------->|                  |
   |                                  |<-- { access_token, id_token } -|                  |
   |                                  |                                |                  |
   |   Verify id_token signature      |                                |                  |
   |   Extract { sub, email, name, picture }                          |                  |
   |                                  |                                |                  |
   |   Upsert user in Supabase        |                                |                  |
   |   (google_id, email, name, picture, last_login_at)               |                  |
   |                                  |-----upsert users table-------->|                  |
   |                                  |<-- user row -------------------|                  |
   |                                  |                                |                  |
   |   Sign JWT { sub, email, name, picture } with JWT_SECRET         |                  |
   |   Set-Cookie: auth_token=JWT; HttpOnly; Secure; SameSite=Lax     |                  |
   |   Clear pkce_verifier cookie     |                                |                  |
   |<-- 302 redirect to /app/dashboard|                                |                  |
   |                                  |                                |                  |
   |=== Subsequent Authenticated Requests ===                          |                  |
   |                                  |                                |                  |
   |   POST /api/prescriptions/upload (cookie: auth_token=JWT)         |                  |
   |--------------------------------->|                                |                  |
   |   requireAuth middleware:        |                                |                  |
   |     Read auth_token cookie       |                                |                  |
   |     Verify JWT signature         |                                |                  |
   |     If valid: attach req.user    |                                |                  |
   |     If invalid/missing: 401      |                                |                  |
   |   Route handler runs             |                                |                  |
   |<-- 200 { prescription data }     |                                |                  |
   |                                  |                                |                  |
   |=== Logout ===                    |                                |                  |
   |                                  |                                |                  |
   |   POST /api/auth/logout           |                                |                  |
   |--------------------------------->|                                |                  |
   |   Clear auth_token cookie (maxAge=0)                             |                  |
   |<-- 200 { success: true }          |                                |                  |
   |-- client clears AuthContext       |                                |                  |
   |-- redirect to /login             |                                |                  |
```

---

## 5. Database Schema — New `users` Table

Run this SQL in the **Supabase Dashboard → SQL Editor** before deploying:

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

-- Row Level Security: service-role key bypasses RLS; block anon access.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.users
  FOR ALL USING (false);
```

> **Note:** The `supabaseAdmin` client in `server/src/lib/supabase.ts` uses the service-role key which bypasses RLS. This is correct for server-side operations.

---

## 6. Complete File List

### New Files to Create

| File | Purpose |
|---|---|
| `server/src/routes/auth.ts` | Express router: `GET /api/auth/google/url`, `GET /api/auth/google/callback`, `GET /api/auth/me`, `POST /api/auth/logout` |
| `server/src/lib/jwt.ts` | Sign/verify JWT using `jsonwebtoken`; exports `signToken(payload)` and `verifyToken(token)` |
| `server/src/middleware/requireAuth.ts` | Express middleware: reads `auth_token` cookie, verifies JWT, attaches `req.user`; returns 401 if missing/invalid |
| `server/src/tasks/upsertUser.ts` | Business logic: upsert Google user profile into Supabase `users` table; returns the stored user row |
| `client/src/pages/LoginPage.jsx` | Full login page UI with "Continue with Google" button, loading/error states, matches existing design system |
| `client/src/pages/LoginPage.css` | Scoped CSS for LoginPage following existing `.css` + BEM class naming conventions |
| `client/src/context/AuthContext.jsx` | React context: `{ user, isLoading, logout }` — fetches `/api/auth/me` on mount, provides auth state app-wide |
| `client/src/components/ProtectedRoute.jsx` | Wrapper component: redirects unauthenticated users to `/login`; shows spinner while auth is loading |

### Existing Files to Modify

| File | Change |
|---|---|
| `server/src/index.ts` | Import and mount `authRouter` at `/api/auth`; add `cookie-parser` middleware |
| `server/package.json` | Add `jsonwebtoken`, `cookie-parser`, `google-auth-library`, `express-rate-limit` as runtime deps; add `@types/jsonwebtoken`, `@types/cookie-parser` as dev deps |
| `client/src/App.tsx` | Add `/login` route; wrap `/app/*` routes in `<ProtectedRoute>`; wrap app in `<AuthProvider>` |
| `client/src/app/AppLayout.jsx` | Add user avatar + name display and a "Logout" button in the nav header actions area |
| `.env.example` | Add new `JWT_SECRET`, `JWT_EXPIRES_IN` stubs with comments; update existing Google OAuth stubs |
| `README.md` | Add "Google Cloud Console Setup" and "Vercel Environment Variables" sections |

---

## 7. New Environment Variables

### Server-Side Variables

| Variable | Example Value | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `123456789-abc.apps.googleusercontent.com` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxxxxxxxxxx` | OAuth 2.0 Client Secret from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `http://localhost:5000/api/auth/google/callback` | Must exactly match Authorized redirect URI in Google Cloud Console |
| `JWT_SECRET` | `your-random-256-bit-secret-here` | Secret for signing JWTs. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `30d` | JWT lifetime (jsonwebtoken duration string) |
| `NODE_ENV` | `development` | Controls `Secure` cookie flag (only set in production) |

> **Already exist in `.env.example`:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — stubs will be updated with proper comments.

### Client-Side Variables

**No new client-side env vars needed.** The Authorization Code Flow does not expose `GOOGLE_CLIENT_ID` to the browser — the frontend fetches the auth URL from `/api/auth/google/url` instead.

---

## 8. Protected vs. Public Routes

### Backend API Routes

| Route | Method | Protected? | Reason |
|---|---|---|---|
| `GET /health` | GET | No | Health check — must be reachable without auth |
| `GET /api/auth/google/url` | GET | No | Generates OAuth URL for login (pre-auth) |
| `GET /api/auth/google/callback` | GET | No | Receives OAuth code from Google (pre-auth) |
| `GET /api/auth/me` | GET | Yes | Returns current user profile; 401 if not logged in |
| `POST /api/auth/logout` | POST | Yes | Clears auth cookie |
| `POST /api/prescriptions/upload` | POST | Yes | Core feature — requires identity |
| `POST /api/prescriptions/confirm` | POST | Yes | Confirms and saves prescription data |
| `GET /api/schedule/today` | GET | Yes | Returns user's schedule |
| `POST /api/schedule/log-dose` | POST | Yes | Logs dose status |
| `POST /api/schedule/simulate-time` | POST | Yes | Demo/hackathon endpoint — still protected |
| `GET /api/schedule/caregiver/alerts` | GET | Yes | Caregiver data |

### Frontend Routes

| Route | Protected? | Behavior if Unauthenticated |
|---|---|---|
| `/` | No | Landing page — visible to all |
| `/login` | No (redirect-away) | If already logged in, redirect to `/app/dashboard` |
| `/app/*` (all sub-routes) | Yes | Redirect to `/login` |

---

## 9. Google Cloud Console Setup Steps (Manual — You Must Do This)

> These steps cannot be automated — they require your Google account credentials.

### Step 1: Create or Select a Project

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. In the top project selector dropdown, click **"New Project"**
3. Name it `MediflowAI` (or select existing if one exists)

### Step 2: Configure the OAuth Consent Screen

1. Left sidebar: **APIs & Services > OAuth consent screen**
2. Select **"External"** user type
3. Fill in:
   - **App name:** `MediflowAI`
   - **User support email:** your email
   - **Developer contact email:** your email
4. **Scopes**: click "Add or Remove Scopes" and add: `openid`, `email`, `profile`
5. **Test users** (while in Testing mode): add your own Google email(s)
6. Save and Continue

### Step 3: Create OAuth 2.0 Credentials

1. Left sidebar: **APIs & Services > Credentials**
2. Click **"+ Create Credentials" > "OAuth 2.0 Client IDs"**
3. Application type: **"Web application"**
4. Name: `MediflowAI Web`
5. **Authorized JavaScript origins** (add each separately):
   ```
   http://localhost:5173
   http://localhost:5000
   https://mediflow-ai-kappa.vercel.app
   ```
6. **Authorized redirect URIs** (add each separately):
   ```
   http://localhost:5000/api/auth/google/callback
   https://mediflow-ai-kappa.vercel.app/api/auth/google/callback
   ```
   *(If you have a custom domain, also add: `https://mediflow.ai/api/auth/google/callback`)*
7. Click **"Create"**
8. **Copy the Client ID and Client Secret** — you will need them for local `.env` and Vercel

### Step 4: Publish the App (when ready for production)

- While in **"Testing"** mode, only test users can log in (up to 100 users)
- For wider access: OAuth consent screen > **"Publish App"** (requires Google verification for sensitive scopes)
- For hackathon/demo: Testing mode is sufficient

---

## 10. Vercel Deployment Plan

### 10.1 Architecture on Vercel

```
vercel.json (root)
  /api/(*) → api/index.ts → re-exports Express app from server/src/index.ts
  /(non-api) → client/dist/index.html (SPA fallback)
```

The Express app runs as a **single serverless function** (`api/index.ts`). This means:

- **No persistent in-memory state** — JWT is stateless, no session store needed
- **No Redis, no sticky sessions** — correct approach for Vercel's serverless model
- **Cold starts**: JWT verification is a ~1ms CPU operation; Supabase upsert only happens on login

### 10.2 Redirect URI Strategy Across Environments

| Environment | `GOOGLE_REDIRECT_URI` value | Registered in Google Cloud? |
|---|---|---|
| Local dev | `http://localhost:5000/api/auth/google/callback` | Yes (Step 3 above) |
| Vercel production | `https://mediflow-ai-kappa.vercel.app/api/auth/google/callback` | Yes (Step 3 above) |
| Vercel preview deployments | **Not supported — see workaround below** | No (wildcard URIs not allowed by Google) |

#### Preview Deployment Workaround

Google OAuth does **not** allow wildcard redirect URIs (e.g., `https://*.vercel.app/...`). Vercel preview deployments get unique, unpredictable URLs.

**Chosen approach — Option 1: Exclude OAuth from preview deploys.**

Set `GOOGLE_REDIRECT_URI` in Vercel to the production URL only. Preview deploys will have a non-functional login flow (will redirect to production), but all other features work. This is documented in the README. No ongoing maintenance required.

**Alternative if needed — Option 2:** Set up a fixed "Preview" domain alias in Vercel (e.g., `preview.mediflow.ai`) and register it in Google Cloud Console.

### 10.3 Vercel Environment Variables (Dashboard Steps)

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select the **MediflowAI** project
3. Click **Settings > Environment Variables**
4. Add each variable with the scope noted below:

| Variable | Environment Scope | Value |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Production + Preview | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Production only | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Production | `https://mediflow-ai-kappa.vercel.app/api/auth/google/callback` |
| `JWT_SECRET` | Production + Preview | A unique 256-bit random hex string |
| `JWT_EXPIRES_IN` | Production + Preview | `7d` |
| `SUPABASE_URL` | Production + Preview | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only | Supabase service role key |
| `NODE_ENV` | Production | `production` |

> Existing variables (`GEMINI_API_KEYS`, `GROQ_API_KEYS`, etc.) remain unchanged.

### 10.4 Cookie Settings for Vercel

```
Set-Cookie: auth_token=<JWT>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
```

- `HttpOnly`: prevents JavaScript access (XSS protection)
- `Secure`: only set when `NODE_ENV === 'production'` (allows local HTTP dev)
- `SameSite=Lax`: allows cookies on top-level navigation redirects (critical for OAuth callback flow)
- `SameSite=Strict` would break the callback — Google's redirect is a cross-site top-level navigation

---

## 11. Risks and Ambiguities Found in the Existing Codebase

| # | Risk / Ambiguity | Severity | Mitigation |
|---|---|---|---|
| 1 | **No `cookie-parser` installed.** Express cannot read cookies without it. | High | Add `cookie-parser` to `server/package.json` and mount it in `index.ts` |
| 2 | **`schedule.ts` uses in-memory `demoDoses` array.** Resets on every Vercel cold start — pre-existing risk, not introduced by auth. | Medium | Pre-existing risk. Noted in README. Not in scope for auth branch. |
| 3 | **All frontend files are `.jsx`, not `.tsx`.** New auth files will follow `.jsx` convention; no TypeScript introduced to frontend. | Medium | Follow existing convention consistently. |
| 4 | **`@ts-ignore` used throughout `App.tsx` for `.jsx` imports.** Pattern is established. | Low | Keep consistent with existing pattern. |
| 5 | **`GOOGLE_CLIENT_SECRET` absent from `server/.env.local`.** Developer must create `server/.env` manually. | Medium | README update will cover this explicitly. |
| 6 | **No rate limiting on `/api/auth` endpoints.** README mentions `express-rate-limit` but it is not installed. Auth endpoints are high-value attack surface. | High | Add `express-rate-limit` to auth routes (15 requests / 15 min). |
| 7 | **Vercel backup routes** (`/prescriptions`, `/schedule` without `/api` prefix) exist. Auth callback must NOT have a backup `/auth` route — that would require registering a second redirect URI in Google Cloud. | Medium | Auth router mounted only at `/api/auth`, no bare `/auth` backup. |
| 8 | **Supabase `users` table does not exist yet.** Backend will error on first login if migration not run. | High | SQL migration must be run in Supabase Dashboard before deploying. See Section 5. |
| 9 | **`VERCEL=1` env var already guards `app.listen()`.** No change needed. | Low | No action required. |

---

## 12. Implementation Commit Plan

After approval, code lands in **4 scoped commits** for clean review:

| Commit | Scope | Files Touched |
|---|---|---|
| `feat(auth): backend Google OAuth routes and JWT middleware` | Server only | `server/src/routes/auth.ts`, `server/src/lib/jwt.ts`, `server/src/middleware/requireAuth.ts`, `server/src/tasks/upsertUser.ts`, `server/src/index.ts`, `server/package.json` |
| `feat(auth): frontend login page and AuthContext` | Client only | `client/src/pages/LoginPage.jsx`, `client/src/pages/LoginPage.css`, `client/src/context/AuthContext.jsx`, `client/src/components/ProtectedRoute.jsx` |
| `feat(auth): route protection and navbar logout` | Client wiring | `client/src/App.tsx`, `client/src/app/AppLayout.jsx` |
| `feat(auth): env config and documentation` | Config + docs | `.env.example`, `README.md` |

---

## 13. Open Questions for Your Review

Before any code is written, please confirm or decide:

1. **Session lifetime:** ~~7 days~~ **Decided: 30 days** (`JWT_EXPIRES_IN=30d`). Updated in `.env.example`. No further action needed on this item.

2. **Existing unauth users:** After this change, anyone visiting `/app/*` will be redirected to `/login`. Is this acceptable, or should there be a "try without account" path?

3. **Supabase migration timing:** Will you run the `users` table SQL manually in the Supabase Dashboard, or should I include a `supabase/migrations/` file for the Supabase CLI?

4. **Rate limiting:** I plan 15 requests per 15-minute window on auth routes. Acceptable?

5. **Login route path:** `/login` (flat, matches existing convention) or `/auth/login`?

---

## 14. Packages to Install

### Server (`server/`)

```bash
npm install jsonwebtoken cookie-parser google-auth-library express-rate-limit
npm install --save-dev @types/jsonwebtoken @types/cookie-parser
```

### Client (`client/`)

No new packages needed. The redirect-based Authorization Code flow requires no Google SDK in the browser.

---

*This document is the source of truth for the `authentication` branch. All implementation decisions must trace back here. Any deviation must be noted before the code is written.*

