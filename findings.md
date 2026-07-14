# Findings & Decisions — MediFlow AI

## 2026-07-10 — Initial Kickoff & Technology Choices

### Decisions
1. **Gemini for Multimodal OCR + Parsing**: Instead of separating Google Vision/Tesseract and Gemini, we will use Gemini (specifically `gemini-1.5-flash` or `gemini-2.0-flash`) directly. It accepts image files and can output a structured JSON schema representing the extracted medicines, dosages, frequencies, and explanations in a single round-trip. This simplifies backend dependencies and increases OCR-extraction accuracy.
2. **Supabase over Firebase**: Supabase offers SQL schema definitions and relational constraints which map perfectly to our proposed relational data model (`prescriptions` -> `medicines` -> `schedule_slots` -> `dose_logs`).
3. **Calendar Reminders (Individual Events)**: For the Google Calendar integration, we will create individual events for each dose rather than recurring rules. Since prescriptions have a fixed duration (e.g., "for 7 days"), individual events are simpler to implement, more flexible to log as taken/missed individually, and easier to delete/update if the schedule changes mid-course.
4. **Mock-First Calendar Integration**: The default developer run configuration and core demo target will be the "Mock Calendar Mode" (saving slots to a local database table and rendering a calendar simulator in the UI). Real Google Calendar OAuth is secondary and will only be activated near the end of the sprint via environment variables.
5. **Sanitized Caregiver Invites for Privacy**: To protect patient privacy and avoid exposing sensitive medical data in cleartext emails or calendar notifications, invitations sent to caregiver guests will be strictly sanitized (e.g., "🚨 MediFlow Caregiver Check: Dose scheduled for [Patient Name]") and contain no medicine names, dosages, or specific instructions. Details are only visible inside the authenticated application.

### Constraints & Unknowns
* **Auth & Session Management**: We will implement a simple Supabase Auth login/signup flow on the frontend.
* **Row-Level Security (RLS) & Data Isolation**: All tables must have active Supabase RLS policies scoping reads/writes to `auth.uid() = user_id` (joined through relations where user_id is not directly in the table). This is a critical security constraint that must be verified in our SQL scripts.
* **Prescription Format**: Since handwritten parsing is a stretch goal, we will use clear, printed/typed prescription samples for the demo and initial validation.

### Open Questions
1. How should the user specify their standard meal times (Breakfast, Lunch, Dinner)? We will provide a simple onboarding or profile page where they can set these (e.g. 8:00 AM, 1:00 PM, 8:00 PM) to anchor the schedule times.

### Additional Decisions (2026-07-11)
6. **Caregiver Dashboard Access is Simulated Through Patient's Session (Hackathon Scope)**: The `/caregiver` route is a view inside the patient's own authenticated session — the caregiver does not have a separate Supabase Auth account. `caregiver_name` and `caregiver_email` are informational fields on the patient's profile, used only for Calendar invites. For the demo, the presenter navigates to `/caregiver` on the same device to demonstrate the alert UI. A real production implementation would use a caregiver magic-link invite or OAuth second-party account flow, which is explicitly out of scope for this build.

7. **Sleep Boundary Clamping Uses Nearest-Boundary Logic**: For interval-based dose schedules where a computed time falls in the sleep window (23:00-06:00), the time is clamped to the **nearest** boundary — not always to 23:00. Times between 23:00 and 03:00 (closer to 23:00) clamp to 23:00; times between 03:00 and 06:00 (closer to 06:00) clamp to 06:00. This matches `design.md` Section 5.1 exactly and prevents the scheduler from pulling a 3:00 AM dose seven hours earlier than needed.

