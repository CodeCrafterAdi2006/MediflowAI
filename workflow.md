# User Experience & Workflow — MediFlow AI

This document details the patient and caregiver user journeys, interaction steps, active status escalation rules, and dashboard layouts for MediFlow AI.

---

## 1. User Roles

* **Patient (Senior Citizen / User)**: The person taking the medication. They set their meal times, upload prescriptions, view their daily checklist, and mark doses as Taken.
* **Caregiver (Guardian / Contact)**: The person monitoring the patient. They receive Google Calendar invitations, view the status board, and get real-time alerts if a dose is missed.

---

## 2. Step-by-Step User Journey

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PATIENT ONBOARDING FLOW                         │
└────────────────────────────────────────────────────────────────────────┘
  1. Signup/Login via Supabase Auth.
  2. Configure Profile:
     - Set meal times (Breakfast, Lunch, Dinner, Bedtime).
     - Enter Caregiver Name & Email (used for calendar invites and alerts).
  3. (Optional) Click "Connect Google Calendar" to authenticate OAuth.
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       PRESCRIPTION CAPTURE FLOW                        │
└────────────────────────────────────────────────────────────────────────┘
  4. Patient uploads a photo of their prescription (Image/PDF).
  5. The backend pipeline:
     - OCR + parses the prescription structure using Gemini.
     - Maps frequencies to meal times.
     - Generates plain-language descriptions.
  6. **Interactive Review Wizard**:
     - Patient sees extracted medicines, dosages, explanations, and times.
     - Patient can modify names, dosages, and adjust schedule times.
  7. **Confirmation & Activation**:
     - Patient clicks "Confirm & Sync".
     - Schedule slots are saved, and Google Calendar events are created.
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DAILY CHECKLIST ACTION                          │
└────────────────────────────────────────────────────────────────────────┘
  8. Patient opens the app daily. They see today's doses in a chronological checklist:
     - [ ] 08:00 AM — Amoxicillin (500mg)
     - [ ] 01:00 PM — Vitamin D3
  9. Clicking a dose opens large touch buttons: **[ TAKEN ]**, **[ SKIPPED ]**.
```

---

## 3. Caregiver Notification & Status Escalation Flow (Demo-Optimized)

To ensure the patient remains safe, the system implements an active escalation protocol. For demo reliability, the 1-hour time gap is controlled via the **Demo Time Simulator** UI button, allowing presenters to transition states instantly on stage:

```
                  ┌──────────────────────────────┐
                  │      Dose Scheduled Time     │
                  └──────────────┬───────────────┘
                                 │
                 (Google Calendar sends invites/alerts
                  to Patient & Caregiver emails)
                                 │
                                 ▼
                     Status defaults to "PENDING"
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼ [User Logs Taken]                             ▼ [Simulate 1 Hour Later]
  Patient marks TAKEN                             Click "Simulate Time" Button
         │                                               │
         ▼                                               ▼
  Status = "TAKEN"                                Status = "MISSED"
  • Logged in DB.                                 • Active Alert raised.
  • Updated in dashboard.                         • Caregiver dashboard shows alert.
                                                  • Caregiver contacts patient.
                                                  • Caregiver can click override:
                                                    "Mark Taken (Caregiver Confirmed)"
                                                    (Note: Saved as 'taken' in database.
                                                     In production, a logged_by column
                                                     would track patient vs. caregiver.)
```

### 3.1 Google Calendar Invitees & Privacy Sanitization
* When the backend creates calendar events, it adds the **Caregiver's email** as a guest (`attendees` field in the Google Calendar resource).
* **Sanitized Summary text**: `🚨 MediFlow Caregiver Check: Dose scheduled for [Patient Name]`
* **Sanitized Description text**: `This is an automated notification to verify if [Patient Name] has taken their scheduled dose. Please check the MediFlow AI app to view instructions, details, and log adherence: [Link to App Dashboard].`
* **Privacy Boundary**: Specific medicine names, clinical dosages, and medical instructions are *never* populated in the calendar invitation text. Caregivers must authenticate into the app to see specific medical contents.

---

## 4. Caregiver Dashboard Alerts

If a dose transitions to **Missed**, a prominent, red alert banner is displayed at the top of the Caregiver's dashboard view:

> ### ⚠️ Active Adherence Alerts
> * **Amoxicillin (500mg)** was missed by **John Doe** at **8:00 AM** (Scheduled 1.5 hours ago).
>   * `[ Mark Taken ]` (After verifying they took it)
>   * `[ Snooze Alert ]`

---

## 5. Adherence Analytics Dashboard

The dashboard provides clear, readable stats to encourage the patient and inform the caregiver.

### 5.1 Adherence Progress Ring
* A large circular progress gauge displaying the percentage of successful doses:
  * **Green (80%+)**: "Great Job! Keep going!"
  * **Orange (50%-79%)**: "Take care, you missed some doses recently."
  * **Red (<50%)**: "Critical: Multiple missed medications."

### 5.2 Daily Streak Badge
* A "Streak Counter" displaying a flame icon: `🔥 5 Days Consistent!`
* Visual animations (e.g. fire/celebration sparkles) appear when a new streak milestone is hit.

### 5.3 Medication Cards
* A simple list of active medicines. Each medicine card shows:
  * Medicine name and plain-language summary.
  * A horizontal bar indicating that specific medicine's adherence rate (e.g. "Amoxicillin: 7 of 7 taken [██████████] 100%").
