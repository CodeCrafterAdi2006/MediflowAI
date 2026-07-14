# Development Guide - MediFlow AI

This document is the **developer execution manual**. It translates the milestone structure from `task_plan.md` into concrete, file-level build steps for each phase. Read this alongside `design.md` (for data contracts), `Engineering.md` (for environment configs), and `workflow.md` (for UX flow context).

> **Golden Rule**: Do not move to the next phase until the current phase's acceptance test passes. Each phase has one, clearly stated at the bottom of its section.

---

## Phase 1 - Environment Setup & Integration Smoke Tests

**Goal**: Every external dependency (Gemini, Supabase, Google OAuth) is proven reachable before a single feature line is written. No assumption about connectivity survives this phase.

### 1.1 Backend Scaffold Verification
**Files**: `server/src/index.ts`, `server/.env`

Steps:
1. Create `server/.env` by copying `.env.example` and filling in `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Set `ENABLE_REAL_GOOGLE_CALENDAR=false`.
2. Verify `server/src/index.ts` boots with a basic `GET /health` route that returns `{ status: "ok" }`.
3. Run `npm run dev` in the `server/` directory.

**Acceptance Test**: `curl http://localhost:5000/health` returns `{"status":"ok"}`.

---

### 1.2 Gemini API Smoke Test
**Files**: `server/src/test-gemini.ts`, `server/src/lib/gemini.ts`

Steps:
1. Create `server/src/lib/gemini.ts` - a singleton Gemini client module wrapping `@google/generative-ai`. Export a single `getGeminiClient()` function that reads `GEMINI_API_KEY` from env and throws a descriptive error if it is missing.
2. In `test-gemini.ts`, send a minimal text prompt ("Say hello in JSON format.") and log the response.
3. Run `npx tsx src/test-gemini.ts` from the `server/` directory.

**Acceptance Test**: Console prints a valid JSON-shaped response from Gemini. No API errors.

---

### 1.3 Supabase Connection Smoke Test
**Files**: `server/src/lib/supabase.ts`

Steps:
1. Create `server/src/lib/supabase.ts` exporting a `supabaseAdmin` client using `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`.
2. Write a tiny test (`npx tsx src/test-supabase.ts`) that executes `supabaseAdmin.from('profiles').select('id').limit(1)` and logs the result.

**Acceptance Test**: Query runs without error (empty result is fine - the table may not exist yet).

---

### 1.4 Frontend Scaffold Verification
**Files**: `client/src/App.tsx`, `client/src/index.css`

Steps:
1. Replace the default `App.tsx` with a minimal landing page: "MediFlow AI - Loading..." text centered on screen.
2. Verify Tailwind CSS v4 utility classes render correctly (apply at least one color class).
3. Run `npm run dev` in the `client/` directory.

**Acceptance Test**: Browser at `http://localhost:5173` shows the landing page with Tailwind styles applied (no unstyled HTML).

---

## Phase 2 - Gemini OCR Parsing & Schedule Logic

**Goal**: Given a prescription image, the backend returns a validated, typed medicine list with pre-calculated dose times. This is the core intelligence of the product.

### 2.1 Define Shared TypeScript Types
**Files**: `server/src/types/index.ts`

Steps:
1. Create `server/src/types/index.ts` and define all shared types:

```typescript
export interface MealTimes {
  breakfast: string; // "HH:MM"
  lunch: string;
  dinner: string;
  bedtime: string;
}

export interface ParsedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string | null;
  plainExplanation: string;
}

export interface ScheduledMedicine extends ParsedMedicine {
  suggestedTimes: string[];   // ["08:00", "13:00", "20:00"]
  sleepBoundaryWarning?: string;
}
```

2. These types are the contract between the parser, scheduler, and API response. No other file should define medicine shapes - import from here.

**Acceptance Test**: TypeScript compiler (`tsc --noEmit`) sees no type errors in the types file.

---

### 2.2 Gemini OCR & Parser Task
**Files**: `server/src/tasks/parsePrescription.ts`

Steps:
1. Create the parsing task function:

```typescript
export async function parsePrescriptionImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ rawOcrText: string; medicines: ParsedMedicine[] }>
```

2. Construct a Gemini multimodal prompt with:
   - A system instruction: "You are a prescription parser. Extract all medicines from this image into structured JSON. Do not diagnose or recommend. Output only the JSON object described."
   - The JSON output schema (name, dosage, frequency, durationDays, instructions, plainExplanation).
   - The image as an inline data part.

3. Use `response.text()` and `JSON.parse()` to extract the response. Validate that the top-level `medicines` array is present. If `JSON.parse` fails, return `{ rawOcrText: rawText, medicines: [] }` - this triggers the manual fallback path in the frontend.

4. Wrap the entire Gemini call in a timeout (12 seconds) + 2 retries with exponential backoff (500ms, 1000ms) for 503 or rate-limit errors.

**Acceptance Test**: Call the function with a real prescription image file and assert the returned object contains `medicines.length > 0` with the expected fields populated.

---

### 2.3 Scheduling Heuristics Task
**Files**: `server/src/tasks/buildSchedule.ts`

Steps:
1. Create the scheduling function:

```typescript
export function buildSchedule(
  medicines: ParsedMedicine[],
  mealTimes: MealTimes
): ScheduledMedicine[]
```

2. Implement the frequency-to-time-slot mapping table from `design.md` Section 5:
   - `once daily (morning|am)` => `[mealTimes.breakfast]`
   - `once daily (night|pm|bedtime)` => `[mealTimes.bedtime]`
   - `twice daily` => `[mealTimes.breakfast, mealTimes.dinner]`
   - `three times daily` => `[mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner]`
   - `four times daily` => `[mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner, mealTimes.bedtime]`
   - `every N hours` => computed intervals starting from breakfast (see design.md Section 5.1)
   - Unmatched => `[mealTimes.breakfast]` + flag for user review

3. For interval-based schedules, apply the **nearest-boundary sleep rule** (per design.md Section 5.1):
   - If a computed dose time falls between 23:00 and 06:00, clamp it to the **nearest boundary**:
     - Times between 23:00 and midnight and up through times closer to 23:00 clamp to 23:00.
     - Times from midnight through times closer to 06:00 clamp to 06:00.
   - Concretely: if `minutesFromMidnight(t) < 180` (i.e. before 03:00), clamp to 06:00; otherwise clamp to 23:00.
   - Attach a `sleepBoundaryWarning` string to that medicine explaining what was shifted and why (e.g. "Dose computed for 03:00 AM shifted to 06:00 AM to protect sleep. Please adjust if needed.").

4. Default fallback meal times if the user has not set them: `{ breakfast: "08:00", lunch: "13:00", dinner: "20:00", bedtime: "22:00" }`.

**Acceptance Test**: Unit test the scheduler (using Vitest) with at least 4 frequency strings: "once daily", "twice daily", "three times daily", and "every 8 hours". For the 8-hour case with breakfast at 08:00, the third dose computes to 00:00 (midnight) - verify it clamps to 06:00 (not 23:00) and attaches a warning string.

---

### 2.4 Upload & Confirm API Endpoints
**Files**: `server/src/routes/prescriptions.ts`, `server/src/index.ts`

Steps:
1. Install `multer` for multipart file handling: `npm install multer @types/multer`.
2. Create `POST /api/prescriptions/upload`:
   - Accept a multipart form upload (field name: `prescription`).
   - Read the user's profile from Supabase to get their `meal_times`.
   - Pass the file buffer to `parsePrescriptionImage()`.
   - Pass the result to `buildSchedule()`.
   - Return the combined `ScheduledMedicine[]` array. **No database writes at this step.**
3. Create `POST /api/prescriptions/confirm`:
   - Accept the final (possibly user-edited) `ScheduledMedicine[]` list + `imageUrl` + caregiver info.
   - In a single Supabase transaction, insert: prescriptions then medicines then schedule_slots.
   - Call the Calendar Sync Manager (Phase 4) to create events.
   - Return `{ success: true, prescriptionId, syncedEventsCount }`.
4. Mount the router on `app.use('/api/prescriptions', prescriptionsRouter)` in `index.ts`.

**Acceptance Test**: POST a test image to `/api/prescriptions/upload` via curl or Postman. Assert the response contains a `medicines` array with `suggestedTimes`. The database should still be empty after this call.

---

## Phase 3 - Database & Row-Level Security

**Goal**: All five Supabase tables exist, RLS is enabled and correctly scoped, and the backend can read/write through them.

### 3.1 Apply Schema to Supabase
**Files**: `Engineering.md` Section 4.1 (copy-paste script)

Steps:
1. Open the Supabase Dashboard, navigate to SQL Editor.
2. Paste the full initialization script from `Engineering.md` Section 4.1 verbatim.
3. Click Run. Verify no error messages appear.
4. Navigate to Table Editor and confirm all five tables appear: `profiles`, `prescriptions`, `medicines`, `schedule_slots`, `dose_logs`.

**Acceptance Test**: In the Authentication tab, create a test user. Confirm the RLS policies are listed under the table's RLS Policies panel.

---

### 3.2 Profile Auto-Creation Trigger
**Files**: Supabase SQL Editor

Steps:
1. Create a Supabase DB trigger so that when a new auth user signs up, a matching `profiles` row is automatically created:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

2. This removes the need for the frontend to manually create a profile row after signup.

**Acceptance Test**: Sign up a new test user via the Supabase Auth dashboard. Immediately check the `profiles` table - a new row should appear automatically.

---

### 3.3 Supabase Backend Data Layer Module
**Files**: `server/src/lib/db.ts`

Steps:
1. Create `server/src/lib/db.ts` with typed wrapper functions for all database operations:
   - `getProfile(userId: string): Promise<Profile>`
   - `savePrescriptionTransaction(data, userId: string): Promise<string>` - inserts prescription + medicines + schedule_slots atomically and returns the prescription ID.
   - `getTodaySchedule(userId: string, date: string): Promise<ScheduleWithLogStatus[]>` - joins `schedule_slots` with `dose_logs` for today's date.
   - `upsertDoseLog(scheduleSlotId: string, date: string, status: DoseStatus): Promise<void>`

2. All functions must handle Supabase errors explicitly - throw a typed `DatabaseError` rather than letting raw Supabase error objects bubble up to the route handler.

**Acceptance Test**: Call `savePrescriptionTransaction()` with mock data and verify all three tables contain the inserted rows in the correct relational structure.

---

## Phase 4 - Calendar Sync (Mock-First, Real OAuth Optional)

**Goal**: Schedule slots are reflected in a calendar system. The default path is the mock calendar (no OAuth required). Real Google Calendar OAuth is activated only by flipping an environment variable.

### 4.1 Calendar Client Interface
**Files**: `server/src/lib/calendar/interface.ts`

```typescript
export interface CalendarClient {
  createDoseEvents(
    patient: Profile,
    medicine: Medicine,
    times: string[],
    durationDays: number
  ): Promise<string[]>;  // returns list of event IDs

  deleteDoseEvents(eventIds: string[]): Promise<void>;
}
```

---

### 4.2 Mock Calendar Client
**Files**: `server/src/lib/calendar/mockCalendar.ts`

Steps:
1. Implement `CalendarClient`:
   - `createDoseEvents`: Logs sanitized event details to console. Generates deterministic fake event IDs (e.g. `mock-<uuid>`). Does not send any emails or external requests.

**Acceptance Test**: Call `createDoseEvents` and verify the console output contains the sanitized event title with no medicine name in it. Confirm the returned event ID array has the correct length.

---

### 4.3 Real Google Calendar Client (Late Sprint)
**Files**: `server/src/lib/calendar/googleCalendar.ts`, `server/src/routes/auth.ts`

> Only activate when `ENABLE_REAL_GOOGLE_CALENDAR=true` in `.env`.

Steps:
1. Implement `CalendarClient` using `googleapis`:
   - Event title: `MediFlow Caregiver Check: Dose scheduled for [Patient Name]`
   - Event description: Sanitized - no medicine names. Link to app dashboard only.
   - Attendees: `[{ email: caregiver_email }]`
2. Add OAuth flow endpoints:
   - `GET /api/auth/google` - redirects to Google consent screen.
   - `GET /api/auth/google/callback` - exchanges code for tokens, saves `refresh_token` to profile.

**Acceptance Test**: An event appears in the linked Google Calendar. The description contains zero medicine-identifying words.

---

### 4.4 Calendar Client Factory
**Files**: `server/src/lib/calendar/index.ts`

```typescript
export function getCalendarClient(): CalendarClient {
  if (process.env.ENABLE_REAL_GOOGLE_CALENDAR === 'true') {
    return new GoogleCalendarClient();
  }
  return new MockCalendarClient();
}
```

Switching modes requires zero code changes - only an env var flip.

---

## Phase 5 - React Frontend

**Goal**: A complete, polished, accessible UI covering every user action: signup, profile setup, prescription upload, review wizard, daily checklist, simulate missed dose, caregiver alert.

### 5.1 Supabase Auth Client & Route Guards
**Files**: `client/src/lib/supabase.ts`, `client/src/components/ProtectedRoute.tsx`

Steps:
1. Create Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Create an `AuthContext` wrapping the app, exposing `user`, `session`, `signIn`, `signUp`, `signOut`.
3. Create `ProtectedRoute` - redirects to `/login` if no active session.

---

### 5.2 Page & Router Structure
**Files**: `client/src/App.tsx`, `client/src/pages/`

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage.tsx` | Email + password form. Link to signup. |
| `/signup` | `SignupPage.tsx` | Email + password + name. |
| `/profile` | `ProfilePage.tsx` | Set meal times + caregiver name & email. |
| `/upload` | `UploadPage.tsx` | Prescription image upload (drag-drop or browse). |
| `/review` | `ReviewPage.tsx` | Editable wizard reviewing parsed medicines + times. |
| `/dashboard` | `DashboardPage.tsx` | Today's dose checklist + Simulate button. |
| `/caregiver` | `CaregiverPage.tsx` | Caregiver alert dashboard view. |

Use React Router v6 (`npm install react-router-dom`). Wrap all pages except `/login` and `/signup` in `ProtectedRoute`.

---

### 5.3 Prescription Upload Wizard
**Files**: `client/src/pages/UploadPage.tsx`, `client/src/pages/ReviewPage.tsx`

**UploadPage**:
1. File input + drag-and-drop zone (large, minimum 56px touch targets).
2. On submit, POST the image to `/api/prescriptions/upload`. Show loading state with sequential messages: "Analyzing prescription...", "Building your schedule...".
3. On success, store `ScheduledMedicine[]` in React state and navigate to `/review`.
4. On Gemini failure (empty medicines array), show a manual entry form as the fallback UI.

**ReviewPage**:
1. Render one card per medicine: Name, What It's For, and suggested time slots as editable `<input type="time">` fields.
2. Show sleep boundary warnings inline in amber below the affected time field.
3. "Confirm & Sync" button POSTs to `/api/prescriptions/confirm`.
4. On success, navigate to `/dashboard` with a brief celebration message.

---

### 5.4 Dashboard - Daily Dose Checklist
**Files**: `client/src/pages/DashboardPage.tsx`, `client/src/components/DoseCard.tsx`

Steps:
1. On mount, fetch `GET /api/schedule/today`. Render a chronologically-ordered list of `DoseCard` components.
2. Each `DoseCard`: Time, Medicine Name, Dosage. Buttons: TAKEN and SKIP (minimum 56px height).
3. On button click, POST to `/api/logs/update`. Update local state optimistically with a subtle checkmark animation.
4. Add "Simulate 1 Hour Later" button in a clearly marked Demo Controls section (amber background, small "Demo Only" label). Clicking it marks the first `pending` dose as `missed` and refreshes the list.

---

### 5.5 Caregiver Alert Dashboard
**Files**: `client/src/pages/CaregiverPage.tsx`, `client/src/components/AlertCard.tsx`

> **Hackathon Demo Scope**: The `/caregiver` route is accessed via the patient's own authenticated session. There is no separate caregiver Supabase Auth account or magic-link invitation flow. For the demo, the presenter navigates to `/caregiver` on the same device to show what a caregiver would see. A real caregiver-invite or second-party auth flow is explicitly out of scope for this build. If a judge asks "how does the caregiver actually log in?", the answer is: they would receive a magic-link or OAuth invite in a production version; for the hackathon the view is demonstrated through the patient's session.

Steps:
1. Fetch all `missed` dose logs for today. Render an alert banner if any exist.
2. Each `AlertCard`: Medicine name, dosage, scheduled time, time since scheduled.
3. Action buttons: Mark Taken (calls `upsertDoseLog` with `taken`) and Snooze (hides card in local state for 30 minutes).
4. If no missed doses: render a green "All doses accounted for" confirmation state.

---

### 5.6 Profile Page
**Files**: `client/src/pages/ProfilePage.tsx`

Steps:
1. Load current user profile from Supabase on mount.
2. Four time inputs for meal times (Breakfast, Lunch, Dinner, Bedtime) with sensible defaults.
3. Text inputs for Caregiver Name and Caregiver Email.
4. "Save Profile" button saves to Supabase and shows a confirmation toast.

**Acceptance Test (Phase 5)**: Full end-to-end walkthrough - signup, set profile, upload test prescription, confirm parsed schedule, check off one dose, click Simulate, verify caregiver alert card appears on `/caregiver`.

---

## Phase 6 - Analytics & Polish (Stretch Goal - Cut First if Behind)

**Goal**: Make the adherence data visually compelling. No new user-facing features - only makes existing data look better.

### 6.1 Adherence Progress Ring
**Files**: `client/src/components/AdherenceRing.tsx`

1. Pure SVG circular progress ring. Color thresholds: 80%+ Emerald, 50-79% Amber, below 50% Red.
2. Animate ring fill on mount using a CSS `stroke-dashoffset` transition.
3. Calculate percentage from dose_logs: `taken / (taken + missed + skipped) * 100`.

---

### 6.2 Daily Streak Counter
**Files**: `client/src/components/StreakBadge.tsx`

1. Query dose logs for the past 30 days. A "consistent day" = zero missed doses.
2. Count the longest current consecutive-consistent-day streak.
3. Render: fire emoji + "N Days Consistent!" with a small CSS scale-bounce animation on first render.

---

### 6.3 Per-Medicine Progress Bars
**Files**: `client/src/components/MedicineProgressBar.tsx`

1. For each active medicine, calculate `taken / total_doses_to_date` as a percentage.
2. Render a horizontal bar with the medicine name, count label ("7 of 7 taken"), and an animated fill.

---

### 6.4 Final UI Polish

1. Review every page on a mobile viewport (375px width). Fix any layout breaks.
2. Verify all interactive elements have accessible `aria-label` attributes.
3. Confirm the safety disclaimer is visible on the Dashboard and Upload pages.
4. Check color contrast on key CTA buttons (WCAG AA compliant).

**Acceptance Test (Phase 6)**: The analytics page renders with live data. The progress ring animates on load. The streak counter correctly shows 0 if any dose was missed today.

---

## Cross-Cutting: File Ownership Map

| Area | Files | Owner Phase |
|---|---|---|
| Gemini client | `server/src/lib/gemini.ts` | Phase 1 |
| Supabase admin client | `server/src/lib/supabase.ts` | Phase 1 |
| Shared types | `server/src/types/index.ts` | Phase 2 |
| OCR parser task | `server/src/tasks/parsePrescription.ts` | Phase 2 |
| Scheduler task | `server/src/tasks/buildSchedule.ts` | Phase 2 |
| API routes | `server/src/routes/prescriptions.ts`, `logs.ts`, `schedule.ts` | Phase 2 |
| DB wrapper | `server/src/lib/db.ts` | Phase 3 |
| Calendar interface | `server/src/lib/calendar/interface.ts` | Phase 4 |
| Mock calendar | `server/src/lib/calendar/mockCalendar.ts` | Phase 4 |
| Real calendar | `server/src/lib/calendar/googleCalendar.ts` | Phase 4 (late) |
| Auth & routing | `client/src/lib/supabase.ts`, `App.tsx` | Phase 5 |
| Upload wizard | `client/src/pages/UploadPage.tsx`, `ReviewPage.tsx` | Phase 5 |
| Dashboard | `client/src/pages/DashboardPage.tsx` | Phase 5 |
| Caregiver alerts | `client/src/pages/CaregiverPage.tsx` | Phase 5 |
| Analytics | `client/src/components/AdherenceRing.tsx`, `StreakBadge.tsx` | Phase 6 |

---

## Decision Boundary: When to Cut

If at any point the team is behind schedule, apply this priority order without debate:

1. Keep - Phase 1-3 (backend + DB): non-negotiable, nothing works without these.
2. Keep - Phase 5 core flow (upload wizard + dashboard + caregiver alert).
3. Defer - Phase 4 Real Google Calendar OAuth. Mock calendar is fully demoable on its own.
4. Cut - Phase 6 analytics (rings, streaks, bars): drop immediately if time is short.
