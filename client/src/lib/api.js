/**
 * MediFlow AI — Centralized API Service Layer
 *
 * All fetch calls to the Express backend live here.
 * No component should use raw `fetch` to our server directly.
 *
 * Base URL is controlled by VITE_API_URL in client/.env,
 * defaulting to localhost:5000 for development.
 */

const defaultBase = import.meta.env.PROD ? '' : 'http://localhost:5000'
export const API_BASE = (import.meta.env.VITE_API_URL ?? defaultBase).replace(/\/$/, '')

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
    credentials: 'include',
    body: formData,
  })

  return handleResponse(res)
}

export async function confirmPrescription(medicines, patientName = 'Patient') {
  const res = await fetch(`${API_BASE}/api/prescriptions/confirm`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicines, patientName }),
  })

  return handleResponse(res)
}

export async function getTodaySchedule() {
  const res = await fetch(`${API_BASE}/api/schedule/today`, {
    credentials: 'include',
  })
  return handleResponse(res)
}

export async function logDose(slotId, date, status) {
  const res = await fetch(`${API_BASE}/api/schedule/log-dose`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId, date, status }),
  })
  return handleResponse(res)
}

export async function getCaregiverAlerts() {
  const res = await fetch(`${API_BASE}/api/schedule/caregiver/alerts`, {
    credentials: 'include',
  })
  return handleResponse(res)
}
