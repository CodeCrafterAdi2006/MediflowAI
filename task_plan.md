# Task Plan — MediFlow AI

## Objective
Build a functional MVP for MediFlow AI that accepts a prescription image upload, parses it using Gemini multimodal LLM, schedules concrete dose timings matched to user meal times, creates Google Calendar events (inviting both patient and caregiver with sanitized privacy-safe invitations), and provides an adherence tracking dashboard with active caregiver alerts.

## Scope Boundaries

### In Scope (Core MVP)
* User signup/login (Supabase Auth).
* Meal time setup (profile config).
* Caregiver assignment (name, email).
* Prescription image upload (Supabase Storage).
* Extraction pipeline: Gemini analyzes image, returns structured JSON (`{ medicines: [{ name, dosage, frequency, duration_days, instructions, plain_explanation }] }`).
* Schedule slot builder: converts extracted frequencies (e.g. "Twice daily after food") into daily times based on user meal times.
* Google Calendar Integration: live sync of schedule slots to a dedicated "MediFlow AI" calendar, adding the Caregiver as a guest/invitee using strictly sanitized details (no medicine names or dosages in the invitation text).
* Adherence Dashboard & Alerts: log daily doses as Taken, Missed, or Skipped. 
* Demo Time Simulator: A manual "Simulate 1 Hour Later" UI control to trigger status transitions to "Missed" and display active caregiver dashboard alerts safely on stage.
* Safety Warning: visual disclaimer displayed prominently in the application.

### Stretch Scope (First to cut if timeline slips)
* Adherence Analytics: circular progress rings, Daily Streak badges, and individual medicine progress bars.

### Out of Scope (Hackathon Cuts)
* Direct SMS / WhatsApp / Web Push reminders (Calendar reminders and email invites are the sole focus).
* Dynamic handwriting recognition optimization (printed/typed prescriptions are the primary target).
* Background Cron/Daemon: Automatic backend timers for missed doses are replaced by the UI Simulator button to prevent live-demo synchronization risks.

## Milestones & Status

* [ ] **Milestone 1: Project Setup & Links**
  * Initialize Node/Express backend with TypeScript and React frontend in decoupled directories.
  * Verify base backend and frontend builds.
  * Connect Gemini API client and run minimal test script (`test-gemini.ts`).
  * *Acceptance Criteria*: Express server and React client running independently, Gemini responds to a basic test query.

* [ ] **Milestone 2: Parsing & Schedule Logic**
  * Implement backend OCR/Parsing task layer using Gemini prompt logic.
  * Write Task-layer scheduling algorithm converting frequency strings to time slots using user's meal settings and sleep boundaries.
  * Create backend API endpoints for upload, parsing, and schedule confirmation.
  * *Acceptance Criteria*: Backend accepts an image, returns parsed structured medicine list and generated daily schedules. Core scheduling logic verified with basic unit tests (timeboxed).

* [ ] **Milestone 3: Database & Access Control**
  * Create tables in Supabase for `profiles`, `prescriptions`, `medicines`, `schedule_slots`, and `dose_logs` by pasting the schema script into the SQL Editor.
  * Verify Row-Level Security (RLS) policies are active and correctly scope reads/writes to `auth.uid() = user_id`.
  * *Acceptance Criteria*: Supabase backend stores user information, RLS blocks unauthorized cross-user reads.

* [ ] **Milestone 4: Google Calendar OAuth & Sync**
  * Implement Google Calendar OAuth flow and event creation/deletion logic.
  * Build the dual-mode client: default dev environment to Mock Calendar database storage, allowing real OAuth to be activated via variables.
  * Sanitization: ensure the event title and description sent to caregivers contain no medication or dosage names.
  * *Acceptance Criteria*: Saved schedules sync to the database (mock mode) and trigger guest invites to the caregiver (real OAuth mode).

* [ ] **Milestone 5: Core Frontend UI & Adherence Dashboard (Must-Have)**
  * Build a clean, high-contrast, accessible React UI with large buttons (>56px) and a step-by-step upload/edit wizard.
  * Pages: Login, Dashboard (today's checklist), Profile (meal times & caregiver email), and Caregiver Dashboard Alerts.
  * Implement Take/Skip checklist state updates.
  * Implement the manual "Simulate Time Passing" button to trigger the caregiver alert dashboard state.
  * *Acceptance Criteria*: End-to-end demo walkthrough runs from image upload to calendar database verification, dashboard checking, and simulated alert displays.

* [ ] **Milestone 6: Adherence Analytics & Polish (Stretch/Nice-to-Have)**
  * Build the Analytics Page containing the circular progress ring, Daily Streak badges, and individual medication progress bars.
  * Implement CSS animations for the streak counters.
  * *Acceptance Criteria*: Visual analytics render and update correctly when checklist items are completed. First to cut if behind schedule.



