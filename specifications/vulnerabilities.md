# MediFlow AI — Security Vulnerabilities: Our Response & Fix Plan

**Audit Date**: 2026-07-24
**Response Date**: 2026-07-25
**Total Issues**: 17 (3 Critical · 5 High · 5 Medium · 4 Low)

Each section records: the exact problem, our verdict on urgency, and the precise code change we will apply.

---

## Priority Triage

| Priority | Fix Before | Issues |
|---|---|---|
| **🔴 Fix Now** | Hackathon demo day | C-1, C-3, H-2, H-3, H-4, M-2 |
| **🟡 Fix This Sprint** | End of hackathon | C-2, H-1, M-1, M-3, L-1, L-2 |
| **🟢 Post-Hackathon** | Before any real users | H-5, M-4, M-5, L-3, L-4 |

---

## CRITICAL

---

### C-1: Live Supabase URL in Git / progress.md

**Problem**: `https://yhmajxdekidakmihzlsa.supabase.co` is referenced in `specifications/progress.md` line 66. The `.gitignore` has conflict markers (see H-4) which means `.env.local` may not be reliably excluded, and the anon key could be committed in git history.

**Our Fix Plan**:

**Step 1 — Audit git history for any committed secrets:**
```bash
git log --all -S "supabase.co" --oneline
git log --all -S "sb_publishable" --oneline
```

**Step 2 — Scrub `specifications/progress.md`**: Replace the raw URL with a placeholder reference:
```markdown
# Before (line 66):
SUPABASE_URL=https://yhmajxdekidakmihzlsa.supabase.co

# After:
SUPABASE_URL=<see server/.env — not committed to git>
```

**Step 3 — Fix `.gitignore` first** (see H-4 below). After that:
```bash
git check-ignore -v client/.env server/.env .env.local
```
All three must return a match. If any don't, add them explicitly to `.gitignore`.

**Step 4 — Rotate keys immediately** if the URL + anon key appear together anywhere in git history. Do this in Supabase dashboard → Project Settings → API → Regenerate.

**Priority**: 🔴 Fix Now.

---

### C-2: Zero Authentication on All API Endpoints

**Problem**: Every Express route is fully open. Anyone can call `POST /api/prescriptions/upload` to burn our paid AI quota, or mutate dose records they don't own.

**Our Fix Plan**:

**Create `server/src/middleware/requireAuth.ts`:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: missing token.' });
    return;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized: invalid or expired token.' });
    return;
  }

  (req as any).user = user;
  next();
}
```

**Apply in `server/src/index.ts`:**
```typescript
import { requireAuth } from './middleware/requireAuth.js';

app.use('/api/prescriptions', requireAuth, prescriptionsRouter);
app.use('/api/schedule',       requireAuth, scheduleRouter);
```

**On the client side** (`client/src/lib/api.js`): Pass the Supabase session token:
```javascript
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}
}
```

**Priority**: 🟡 Fix This Sprint.

---

### C-3: CORS Wildcard `*` on a Healthcare API

**Problem**: `origin: '*'` with `credentials: true` means any website can make credentialed cross-origin requests to our server.

**Our Fix — update `server/src/index.ts`:**
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://mediflow.ai',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed.`));
    }
  },
  credentials: true,
}));
```

**Priority**: 🔴 Fix Now. Zero-risk one-liner change.

---

## HIGH

---

### H-1: Service-Role Key Bypasses All RLS

**Problem**: The server's `supabaseAdmin` uses the service-role key unconditionally, so every DB query runs as superuser. All RLS policies are completely inactive for any server-side operation.

**Our Fix Plan**:

**1. Remove the silent fallback in `server/src/lib/supabase.ts`:**
```typescript
// BEFORE — silently degrades to anon key:
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

// AFTER — fail loudly at startup if missing:
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Check server/.env.')
}
```

**2. Add a per-request user-scoped client:**
```typescript
export function createUserClient(userJwt: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
}
```

**Priority**: 🟡 Fix This Sprint (after C-2 auth middleware is in place).

---

### H-2: Error Responses Leak Stack Traces

**Problem**: `details: error.message` in 500 responses exposes file paths, SDK internals, and SQL errors to the caller.

**Our Fix — in `server/src/routes/prescriptions.ts`:**
```typescript
// BEFORE (line 56):
res.status(500).json({ error: 'Failed to process prescription image.', details: error.message });

// AFTER:
console.error('[upload] Error processing prescription:', error);
res.status(500).json({ error: 'Failed to process prescription image.' });

// Same change for line 91 (/confirm):
console.error('[confirm] Error confirming prescription:', error);
res.status(500).json({ error: 'Failed to confirm prescription schedule.' });
```

**Priority**: 🔴 Fix Now. 2-line change.

---

### H-3: No Server-Side File Type Validation on Upload

**Problem**: Multer has no `fileFilter`. Any file type can be uploaded and passed to the Gemini API. Client-side `accept="image/*"` is trivially bypassed.

**Our Fix — in `server/src/routes/prescriptions.ts`:**
```typescript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed. Only images are accepted.`));
    }
  },
});
```

Also add a global Express error handler in `index.ts` for multer errors:
```typescript
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message?.includes('not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
});
```

**Priority**: 🔴 Fix Now.

---

### H-4: Unresolved Git Merge Conflict Markers in `.gitignore`

**Problem**: The `.gitignore` has `<<<<<<<`, `=======`, `>>>>>>>` on lines 1, 18, 22, 29, 37, 48. Git treats these as literal path patterns to ignore. Environment file exclusions are unreliable as a result.

**Our Fix — replace `.gitignore` entirely with a clean merged version:**
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
dist/
dist-ssr/
build/

# Environment / Secrets — NEVER commit these
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env
server/.env
client/.env

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# OS / Editor files
.DS_Store
Thumbs.db
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# IDEs
.vscode/
!.vscode/extensions.json
.idea/

# Project confidential
Event_details/
```

Then verify:
```bash
git check-ignore -v server/.env client/.env .env.local
# Each must return a match line. No output = not ignored = danger.
```

**Priority**: 🔴 Fix Now. This is the root cause of C-1 and M-5.

---

### H-5: Google OAuth Refresh Token Stored in Plaintext

**Problem**: `Engineering.md` schema has `google_refresh_token TEXT` — long-lived, sensitive tokens stored without encryption.

**Our Fix Plan** (Post-hackathon):
1. Use **Supabase Vault** for token storage instead of a plain column.
2. Replace `google_refresh_token TEXT` with `google_refresh_token_secret_id UUID REFERENCES vault.secrets(id)`.
3. All token reads go through `vault.decrypted_secrets`.
4. Minimize OAuth scope to `calendar.events` only.

**Priority**: 🟢 Post-Hackathon. No real OAuth tokens exist yet.

---

## MEDIUM

---

### M-1: No Rate Limiting on AI Upload Endpoint

**Problem**: `POST /api/prescriptions/upload` triggers paid AI calls with zero throttling.

**Our Fix**:
```bash
npm install express-rate-limit   # in server/
```

In `server/src/routes/prescriptions.ts`:
```typescript
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minute window
  max: 10,                     // max 10 uploads per user per window
  message: { error: 'Too many upload requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/upload', uploadLimiter, upload.single('prescription'), async (req, res) => {
  // ... existing handler
});
```

Also add a global limiter in `index.ts`:
```typescript
const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
app.use(globalLimiter);
```

**Priority**: 🟡 Fix This Sprint.

---

### M-2: Dose Status Not Validated — Stored XSS Vector

**Problem**: `POST /api/schedule/log-dose` writes any arbitrary `status` string to in-memory state, which is then returned verbatim to all callers.

**Our Fix — in `server/src/routes/schedule.ts`:**
```typescript
const VALID_STATUSES = ['taken', 'missed', 'skipped', 'pending'] as const;

router.post('/log-dose', (req, res) => {
  const { doseId, status } = req.body;

  if (!doseId || !status) {
    res.status(400).json({ error: 'doseId and status are required.' });
    return;
  }

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({
      error: `Invalid status '${status}'. Allowed: ${VALID_STATUSES.join(', ')}.`
    });
    return;
  }

  // ... rest of handler unchanged
});
```

**Priority**: 🔴 Fix Now. Trivial addition that closes a real injection vector.

---

### M-3: Full Medication State in localStorage Plaintext

**Problem**: `MedicationContext.jsx` serializes every medicine name, dosage, caregiver email, and dose history to `localStorage` as plaintext. Any XSS can exfiltrate it. Data also persists on shared devices.

**Short-term fix** — switch to `sessionStorage` (data clears when tab closes):
```javascript
// MedicationContext.jsx — lines 107 and 78:
// BEFORE:
localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
const saved = localStorage.getItem(STORAGE_KEY)

// AFTER:
sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
const saved = sessionStorage.getItem(STORAGE_KEY)
```

**Long-term fix** (post-hackathon): Remove client-side persistence entirely. Persist to Supabase, load from the authenticated API.

**Priority**: 🟡 Fix This Sprint. `sessionStorage` swap is a 2-line change.

---

### M-4: Prompt Injection / Missing AI Output Schema Validation

**Problem**: `parsePrescription.ts` passes the raw AI response directly to `JSON.parse()` without validating the output shape.

**Our Fix** — install `zod` and validate AI output:
```bash
npm install zod   # in server/
```

```typescript
import { z } from 'zod';

const ParsedMedicineSchema = z.object({
  rawOcrText: z.string(),
  medicines: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string(),
    frequency: z.string(),
    durationDays: z.number().int().positive().optional(),
    instructions: z.string().nullable().optional(),
    plainExplanation: z.string(),
  }))
});

// After JSON.parse(cleanedText):
const validated = ParsedMedicineSchema.safeParse(parsed);
if (!validated.success) {
  console.warn('[parsePrescription] AI output failed schema validation:', validated.error.flatten());
  return { rawOcrText: '', medicines: [] };
}
return validated.data;
```

**Priority**: 🟢 Post-Hackathon.

---

### M-5: Supabase Publishable Key Potentially Tracked in Git

**Problem**: `.env.local` may be committed because H-4 broke the `.gitignore`.

**Our Fix**: Resolved entirely by fixing H-4. After that:
```bash
git rm --cached .env.local    # remove from tracking if it was ever staged
git rm --cached client/.env   # same for client env
```

Add a `README.md` note clarifying that `VITE_SUPABASE_PUBLISHABLE_KEY` in the browser bundle is intentional (it is a public key by Supabase design — not a secret).

**Priority**: 🔴 Fix Now (same action as H-4, no extra effort).

---

## LOW

---

### L-1: No HTTP Security Headers

**Problem**: Express doesn't set `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, or `Referrer-Policy`.

**Our Fix**:
```bash
npm install helmet   # in server/
```

```typescript
// server/src/index.ts — add before all routes:
import helmet from 'helmet';
app.use(helmet());
```

**Priority**: 🟡 Fix This Sprint. One import, one line.

---

### L-2: `simulate-time` Demo Endpoint Exposed Without Environment Gating

**Problem**: `POST /api/schedule/simulate-time` manipulates global server state. Anyone who can reach the server can corrupt the demo mid-presentation.

**Our Fix — in `server/src/routes/schedule.ts`:**
```typescript
router.post('/simulate-time', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found.' });
    return;
  }
  // ... existing handler unchanged
});
```

Add to `server/.env`:
```
NODE_ENV=development
```

**Priority**: 🟡 Fix This Sprint. 5-line change.

---

### L-3: RLS Policies Not Version-Controlled

**Problem**: SQL schema in `Engineering.md` is only documentation — no migration files, no verification the live DB matches it.

**Our Fix Plan** (Post-hackathon):
1. `npx supabase init`
2. Create migration files under `supabase/migrations/`
3. `supabase db push` to apply and track
4. Add a startup assertion verifying RLS is enabled on critical tables

**Priority**: 🟢 Post-Hackathon.

---

### L-4: Raw OCR Text (`rawOcrText`) Returned to Client Contains PHI

**Problem**: The full OCR transcript (patient name, clinic address, diagnosis codes) is returned in the upload response and stored in React state. No UI uses it, so it's pure PHI leakage with zero benefit.

**Short-term fix — simply remove it from the response** in `server/src/routes/prescriptions.ts`:
```typescript
// BEFORE:
res.status(200).json({ success: true, rawOcrText, medicines: scheduledMedicines });

// AFTER:
res.status(200).json({ success: true, medicines: scheduledMedicines });
// rawOcrText intentionally omitted — contains potential PHI, no UI feature uses it
```

**Priority**: 🔴 Fix Now. 1-line removal, zero breakage risk (no UI reads this field).

---

## Summary: Immediate Action Checklist (~30 min total)

| # | Action | File | Effort |
|---|---|---|---|
| 1 | Fix `.gitignore` — remove conflict markers | `.gitignore` | 5 min |
| 2 | Remove Supabase URL from `progress.md` | `specifications/progress.md` | 2 min |
| 3 | Fix CORS — replace `*` with allowlist | `server/src/index.ts` | 5 min |
| 4 | Add multer file type filter | `server/src/routes/prescriptions.ts` | 10 min |
| 5 | Strip `details: error.message` from 500 responses | `server/src/routes/prescriptions.ts` | 2 min |
| 6 | Validate dose `status` against allowlist | `server/src/routes/schedule.ts` | 5 min |
| 7 | Remove `rawOcrText` from upload response | `server/src/routes/prescriptions.ts` | 1 min |
| **Total** | | | **~30 min** |

---

> [!CAUTION]
> This document describes the current attack surface in detail. **Do not commit this file to a public repository** or share it outside the team.

*All fixes above are surgical and non-breaking. None require a database migration or Supabase config change.*
