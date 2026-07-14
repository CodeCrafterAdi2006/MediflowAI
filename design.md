# Design Document — MediFlow AI

## 1. System Architecture & Service-Layer Pattern

MediFlow AI follows a standard three-tier architecture separating the Presentation layer, Service (Business Logic) layer, and Data/Infrastructure layer. All client interactions with database and external services are proxied through our backend Express API to maintain clean boundaries.

```
      PRESENTATION LAYER                 BUSINESS LOGIC LAYER             DATA & INFRASTRUCTURE
┌──────────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│                              │  │                         │  │                         │
│   React Frontend (Vite)      │  │  Scheduling Heuristics  │  │  Supabase Client (DB)   │
│   • Onboarding Wizard        │  │  • Meal time mapping    │  │  • PostgreSQL CRUD      │
│   • Today's Dose Checklist   │  │  • Interval calculations│  │  • Storage uploads      │
│   • Adherence Dashboard      │  │                         │  │                         │
│                              │  │  AI Prompt Orchestrator │  │  Gemini API Client      │
│              │               │  │  • Structured OCR parse │  │  • Multimodal analysis  │
│              ▼               │  │  • Plain-lang generator │  │  • Structured JSON      │
│   Express Route Handlers     │  │                         │  │                         │
│   • /api/prescriptions/*     │  │  Calendar Sync Manager  │  │  Google Calendar client │
│   • /api/schedule/*          │  │  • Batch event creator  │  │  • OAuth 2.0 flow       │
│   • /api/logs/*              │  │  • Mock calendar state  │  │  • Event creator/deleter│
│                              │  │                         │  │                         │
└──────────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

---

## 2. End-to-End Data Flow

1. **Upload & OCR**: The user uploads a prescription image via the frontend. The image is sent to the backend, which forwards it to the **Gemini API** along with a JSON-schema instructions prompt.
2. **AI Processing**: Gemini extracts the raw text, parses it into structured medicine data, and generates a plain-language explanation of what each medicine is for.
3. **Heuristic Scheduling**: The backend Task layer takes the parsed frequencies (e.g. "Twice daily after food") and maps them to concrete clock times using the user's meal preferences (e.g., Breakfast at 8:00 AM, Dinner at 8:00 PM).
4. **Interactive Review**: The client displays the parsed medicines, dosages, and generated times in an editable wizard form. The user reviews and updates any incorrect values.
5. **Confirmation & Persistence**: Once confirmed, the data is saved in Supabase:
   - A `prescription` record is created.
   - Associated `medicines` and `schedule_slots` are inserted.
6. **Calendar Sync**: If the user has connected their Google Calendar, the backend creates corresponding events. If not, it writes them to a `mock_calendar_events` table for display in the frontend's Simulated Calendar panel.
7. **Tracking & Checklist**: The user checks off doses as Taken, Missed, or Skipped from the dashboard daily checklist.

---

## 3. Database Schema & Access Control (Supabase RLS)

We utilize Supabase (Postgres) with the following relational schema.

### 3.1 Schema Definition
```sql
-- User Profiles (Linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  meal_times JSONB NOT NULL DEFAULT '{"breakfast": "08:00", "lunch": "13:00", "dinner": "20:00", "bedtime": "22:00"}'::jsonb,
  google_refresh_token TEXT, -- Note: Plaintext storage is a hackathon-scope simplification. In production, this must be encrypted using Vault or an external KMS.
  caregiver_name TEXT,
  caregiver_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Prescriptions Uploaded by Users
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  raw_ocr_text TEXT
);

-- Parsed Medicines
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  instructions TEXT,
  plain_explanation TEXT NOT NULL
);

-- Generated Schedule Slots
CREATE TABLE schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE NOT NULL,
  time_of_day TIME NOT NULL,
  calendar_event_id TEXT
);

-- Dose Performance Log
CREATE TABLE dose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_slot_id UUID REFERENCES schedule_slots(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('taken', 'missed', 'skipped')) NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (schedule_slot_id, date)
);
```

### 3.2 Access Control & Row-Level Security (RLS)
To enforce patient privacy and protect sensitive healthcare data in development and production, we enable Row-Level Security (RLS) on all Supabase tables. All user data reads and writes are scoped to the authenticated user's ID.

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;

-- Examples of ownership checks
CREATE POLICY "Users can only access their own profiles" 
  ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own prescriptions" 
  ON prescriptions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access medicines related to their prescriptions" 
  ON medicines FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prescriptions 
      WHERE prescriptions.id = medicines.prescription_id 
      AND prescriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can only access schedule_slots related to their prescriptions" 
  ON schedule_slots FOR ALL USING (
    EXISTS (
      SELECT 1 FROM medicines
      JOIN prescriptions ON prescriptions.id = medicines.prescription_id
      WHERE medicines.id = schedule_slots.medicine_id
      AND prescriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can only access dose_logs related to their prescriptions" 
  ON dose_logs FOR ALL USING (
    EXISTS (
      SELECT 1 FROM schedule_slots
      JOIN medicines ON medicines.id = schedule_slots.medicine_id
      JOIN prescriptions ON prescriptions.id = medicines.prescription_id
      WHERE schedule_slots.id = dose_logs.schedule_slot_id
      AND prescriptions.user_id = auth.uid()
    )
  );
```

---

## 4. API Endpoints

### 4.1 Authentication
* Handled using Supabase Client SDK on the backend, proxying credentials.

### 4.2 Prescriptions
> [!NOTE]
> **State Design**: The prescription upload flow is completely **stateless**. The `/api/prescriptions/upload` endpoint processes the image, calls the Gemini parser, and returns draft data to the client's local React state. No database records are written at this point. Confirming the parsed prescription in `/api/prescriptions/confirm` writes all objects (Prescription, Medicines, and Schedule Slots) in a single database transaction. This prevents orphaned prescription drafts.

* `POST /api/prescriptions/upload`
  * **Input**: Multipart form containing the prescription image file.
  * **Task**: Sends file buffer to Gemini API, runs OCR, parses into structured medicines and schedules. Returns stateless JSON.
  * **Output**:
    ```json
    {
      "rawOcrText": "...",
      "medicines": [
        {
          "name": "Amoxicillin",
          "dosage": "500mg",
          "frequency": "Three times daily after food",
          "durationDays": 7,
          "instructions": "Finish the entire course",
          "plainExplanation": "An antibiotic to treat bacterial infections. Must be taken after meals.",
          "suggestedTimes": ["08:00", "13:00", "20:00"]
        }
      ]
    }
    ```

* `POST /api/prescriptions/confirm`
  * **Input**: User-modified medicine list, timings, and caregiver info:
    ```json
    {
      "medicines": [
        {
          "name": "Amoxicillin",
          "dosage": "500mg",
          "frequency": "Three times daily after food",
          "durationDays": 7,
          "instructions": "Finish the entire course",
          "plainExplanation": "...",
          "times": ["08:30", "13:30", "20:30"]
        }
      ],
      "image_url": "...",
      "caregiver": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      }
    }
    ```
  * **Task**: Saves prescription, medicines, and schedule_slots records to DB. Triggers Google Calendar event creations (inviting caregiver).
  * **Output**: `{ "success": true, "prescriptionId": "uuid", "syncedEventsCount": 21 }`

### 4.3 Scheduling & Logs
* `GET /api/schedule/today`
  * **Output**: Active schedule slots for the current calendar date, combined with their dose log status.
* `POST /api/logs/update`
  * **Input**: `{ scheduleSlotId, date, status: 'taken' | 'missed' | 'skipped' }`
  * **Output**: `{ success: true, log: { ... } }`

---

## 5. Domain Logic & Scheduling Rules

The backend Task layer resolves frequency strings using a mapping table, aligned to the user's saved `meal_times`:

| Frequency Pattern (Regex) | Target Meal Slots | Explanation |
| :--- | :--- | :--- |
| `once daily (morning\|am)` | `['breakfast']` | Anchor to Breakfast time |
| `once daily (night\|pm\|bedtime)` | `['bedtime']` | Anchor to Bedtime |
| `twice daily` | `['breakfast', 'dinner']` | Morning and night slots |
| `three times daily` | `['breakfast', 'lunch', 'dinner']` | Morning, afternoon, night |
| `four times daily` | `['breakfast', 'lunch', 'dinner', 'bedtime']` | Four intervals |
| `every (\d+) hours` | Computed intervals | (Intervals starting at breakfast. See section 5.1) |

*If the frequency string is not matched, the algorithm defaults to `['breakfast']` and flags it for the user to review.*

### 5.1 Interval Scheduling & Sleep Boundaries
For interval-based instructions (e.g., "Every 8 hours"), the scheduler applies the following deterministic anchoring:
1. **Initial Anchor**: The first dose of the interval is aligned to the user's customized **Breakfast** time (e.g., 08:00 AM).
2. **Subsequent Doses**: Subsequent times are calculated by adding the interval width sequentially:
   - Dose 1: `breakfast_time` (e.g. 08:00 AM)
   - Dose 2: `breakfast_time + 8h` (e.g. 04:00 PM)
   - Dose 3: `breakfast_time + 16h` (e.g. 12:00 AM)
3. **Sleep Hour Bounds**: If any calculated dose falls within the defined sleep window (**11:00 PM to 06:00 AM**):
   - The scheduler defaults the time to the nearest boundary (either 11:00 PM or 06:00 AM).
   - A warning flag is attached to the medicine object, highlighting to the user on the Review Screen: *"Dose computed for 12:00 AM shifted to 11:00 PM to protect sleep. Please adjust if needed."*

---

## 6. UI/UX & Accessibility Specifications

To optimize usability for senior citizens and non-tech-fluent users, the interface adopts a **High-Contrast, Linear Flow**:

1. **Large Text & High Contrast**: Deep Slate (#1E293B) text on warm white backgrounds with bright Medical Emerald (#10B981) key CTA buttons. Text sizes start at `1.25rem` (`text-xl`) for core controls.
2. **Simplified Touch Targets**: All buttons, checkboxes, and links have a minimum target size of `56px` to avoid accidental taps.
3. **Step-by-Step Wizard Flow**:
   * **Step 1: Upload**: Drag-and-drop or snapshot camera. Single button click.
   * **Step 2: Parsing Status**: Clear loading indicator with visual progress messages ("Extracting image text...", "Creating daily schedule...").
   * **Step 3: Edit & Confirm**: Simple tabular review cards showing *Medicine Name*, *What it is for*, and *Times*. Large inputs to adjust times.
   * **Step 4: Done**: Celebration checkmark showing reminders have been synced to Google Calendar.
4. **Daily Dashboard Checklist**: Today's doses are displayed as a chronological card deck. Each card has giant buttons: **[ TAKEN ]**, **[ SKIPPED ]**.

---

## 7. Resilience & Dual-Mode Integration

### Google Calendar Client
```typescript
interface CalendarClient {
  createDoseEvents(user: Profile, medicine: Medicine, times: string[]): Promise<string[]>;
  deleteDoseEvents(eventIds: string[]): Promise<void>;
}
```
* **Production Mode**: Uses the real `googleapis` client. If a token expires, a middleware refreshes it using the saved refresh token.
* **Mock Mode**: Logs event details to the application console and saves them to a mock dashboard array, allowing the application to work out-of-the-box in development.

### 7.2 Google Calendar Privacy & Sanitization
To prevent sensitive patient health details from sitting in cleartext inside standard email notification headers or shared calendar files, Google Calendar invites sent to caregivers are strictly sanitized:
* **Event Title**: `🚨 MediFlow Caregiver Check: Dose scheduled for [Patient Name]`
* **Event Description**: `This is an automated notification to verify if [Patient Name] has taken their scheduled dose. Please check the MediFlow AI app to view instructions, details, and log adherence: [Link to App Dashboard].`
* **Privacy Boundary**: Specific medicine names, clinical dosages, and medical instructions are *never* populated in the calendar invitation text. Caregivers must authenticate into the app to see specific medical contents.

### Gemini API Call Fallback
* Gemini calls are wrapper-configured with:
  * Timeout: 12 seconds.
  * Retries: 2 attempts with exponential backoff for `503 Service Unavailable` or rate limits.
  * Failure Fallback: If Gemini is down or fails to parse, the raw OCR text is returned alongside an empty schedule form, allowing the user to type in their prescription details manually.
