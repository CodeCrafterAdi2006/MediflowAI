/**
 * MediFlow AI — Centralized API Service Layer
 *
 * All fetch calls to the Express backend live here.
 * No component should use raw `fetch` to our server directly.
 *
 * Base URL is controlled by VITE_API_URL in client/.env,
 * defaulting to localhost:5000 for development.
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data.error ?? `HTTP ${res.status}`
    throw new Error(message)
  }
  return data
}

/**
 * POST /api/prescriptions/upload
 * Sends a prescription image file to the Gemini OCR + schedule engine.
 * Returns { success, rawOcrText, medicines: ScheduledMedicine[] }
 *
 * @param {File} file - The image file from the drag-drop zone.
 * @param {object|null} mealTimes - User's meal times from profile, or null for defaults.
 */
export async function uploadPrescription(file, mealTimes = null) {
  const formData = new FormData()
  formData.append('prescription', file)
  if (mealTimes) {
    formData.append('mealTimes', JSON.stringify(mealTimes))
  }

  const res = await fetch(`${API_BASE}/api/prescriptions/upload`, {
    method: 'POST',
    body: formData,
    // Note: Do NOT set Content-Type header — the browser sets multipart boundary automatically.
  })

  return handleResponse(res)
}

/**
 * POST /api/prescriptions/confirm
 * Confirms the reviewed schedule and triggers Calendar Sync (ICS generation).
 * Returns { success, prescriptionId, syncedEventsCount, icsContent }
 *
 * @param {Array} medicines - Final (possibly user-edited) medicine list.
 * @param {string} patientName - Used for privacy-safe calendar event descriptions.
 */
export async function confirmPrescription(medicines, patientName = 'Patient') {
  const res = await fetch(`${API_BASE}/api/prescriptions/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicines, patientName }),
  })

  return handleResponse(res)
}

/**
 * GET /api/schedule/today
 * Fetches today's chronologically ordered dose schedule.
 * Returns { doses: ScheduleSlot[] }
 */
export async function getTodaySchedule() {
  const res = await fetch(`${API_BASE}/api/schedule/today`)
  return handleResponse(res)
}

/**
 * POST /api/schedule/log-dose
 * Marks a dose as taken, missed, or skipped.
 *
 * @param {string} slotId - The schedule slot ID.
 * @param {string} date - ISO date string (YYYY-MM-DD).
 * @param {'taken'|'missed'|'skipped'} status - The new status.
 */
export async function logDose(slotId, date, status) {
  const res = await fetch(`${API_BASE}/api/schedule/log-dose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId, date, status }),
  })
  return handleResponse(res)
}

/**
 * GET /api/schedule/caregiver/alerts
 * Returns all active missed doses for caregiver alert display.
 */
export async function getCaregiverAlerts() {
  const res = await fetch(`${API_BASE}/api/schedule/caregiver/alerts`)
  return handleResponse(res)
}
