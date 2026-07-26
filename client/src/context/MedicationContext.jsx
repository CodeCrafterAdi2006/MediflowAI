import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SAMPLE_EXTRACTION } from '../data/mockData.js'

/**
 * Adapts the server's ScheduledMedicine shape to the UI component shape.
 * Server:  { name, dosage, suggestedTimes: ["08:00"], frequency, instructions }
 * UI:      { id, name, dosage, times: ["08:00"], frequency, foodTiming }
 *
 * Called inside setMedicines() so the entire app is automatically normalised.
 */
function adaptServerMedicine(med, index) {
  // Guard: if it already has `times` it came from Om's mockData — pass through
  if (med.times) return med
  const instructions = (med.instructions ?? '').toLowerCase()
  const foodTiming = instructions.includes('before') ? 'before'
    : instructions.includes('bedtime') ? 'bedtime'
    : 'after'
  return {
    id: `srv-${index}-${Date.now()}`,
    name: med.name ?? '',
    dosage: med.dosage ?? '',
    frequency: med.frequency ?? '1x daily',
    foodTiming,
    times: med.suggestedTimes ?? ['08:00'],
    plainExplanation: med.plainExplanation ?? null,
    sleepBoundaryWarning: med.sleepBoundaryWarning ?? null,
  }
}

const STORAGE_KEY = 'mediflow-app-state'

const MedicationContext = createContext(null)

// Fixed mock history for the last 6 days — only "today" is computed live
// from real dose-log state, so the chart still feels responsive.
const PAST_ADHERENCE = [
  { day: 'Mon', pct: 92 },
  { day: 'Tue', pct: 100 },
  { day: 'Wed', pct: 75 },
  { day: 'Thu', pct: 88 },
  { day: 'Fri', pct: 95 },
  { day: 'Sat', pct: 80 },
]

const DEFAULT_PROFILE = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '20:00',
  bedtime: '22:30',
  caregiverName: '',
  caregiverEmail: '',
}

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function realNowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** A dose is a "late-night" dose if it falls between 10pm and 5am —
 * used to surface an inline amber sleep-safety flag on the Review screen. */
export function isSleepWarning(time) {
  const mins = timeToMinutes(time)
  return mins >= 22 * 60 || mins < 5 * 60
}

/** Builds today's dose log from a medicine list.
 * Only dose times from the upload moment onwards (with a 30-min grace window)
 * are scheduled for today, so a prescription uploaded at 9 PM doesn't generate
 * false "missed" alerts for morning doses that passed before the prescription existed. */
function buildDoseLog(medicines) {
  const now = realNowMinutes()
  const log = []
  medicines.forEach((med) => {
    med.times.forEach((time) => {
      const doseMins = timeToMinutes(time)
      // Skip dose times earlier than 30 mins ago when generating today's schedule
      if (doseMins < now - 30) return

      log.push({
        id: `${med.id}-${time}`,
        medId: med.id,
        name: med.name,
        dosage: med.dosage,
        foodTiming: med.foodTiming,
        time,
        status: 'upcoming',
        snoozeUntil: null, // minutes-of-day the dose is snoozed until, if any
      })
    })
  })

  // If all doses for today had already passed before upload, include the first dose time
  // so today's schedule is ready for the user without being empty
  if (log.length === 0) {
    medicines.forEach((med) => {
      const firstTime = med.times[0] || '08:00'
      log.push({
        id: `${med.id}-${firstTime}`,
        medId: med.id,
        name: med.name,
        dosage: med.dosage,
        foodTiming: med.foodTiming,
        time: firstTime,
        status: 'upcoming',
        snoozeUntil: null,
      })
    })
  }

  return log.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
}

function loadInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        medicines: [],
        doseLog: [],
        hasGeneratedSchedule: false,
        clockOffsetMinutes: 0,
        profile: DEFAULT_PROFILE,
        ...parsed,
      }
    }
  } catch {
    // fall through to defaults
  }
  return {
    medicines: [],
    doseLog: [],
    hasGeneratedSchedule: false,
    clockOffsetMinutes: 0,
    profile: DEFAULT_PROFILE,
  }
}

export function MedicationProvider({ children }) {
  const [state, setState] = useState(loadInitialState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore write errors (e.g. storage disabled)
    }
  }, [state])

  // "Effective now" — the real clock plus whatever the demo controls have
  // fast-forwarded, so overdue/alert logic reacts to Simulate 1 Hour Later.
  const effectiveNowMinutes = realNowMinutes() + state.clockOffsetMinutes

  const api = useMemo(() => {
    return {
      medicines: state.medicines,
      doseLog: state.doseLog,
      hasGeneratedSchedule: state.hasGeneratedSchedule,
      clockOffsetMinutes: state.clockOffsetMinutes,
      profile: state.profile,

      /** Seeds the review screen with a mock extraction if nothing has
       * been uploaded yet — lets each screen be opened directly while
       * prototyping, without a real upload having happened first. */
      seedIfEmpty() {
        setState((s) => (s.medicines.length ? s : { ...s, medicines: SAMPLE_EXTRACTION }))
      },

      setMedicines(medicines) {
        // Auto-normalise server ScheduledMedicine → UI medicine shape
        const normalised = medicines.map(adaptServerMedicine)
        setState((s) => ({ ...s, medicines: normalised }))
      },

      /** Confirms the reviewed medicine list and generates today's schedule. */
      generateSchedule(medicines) {
        setState((s) => ({
          ...s,
          medicines,
          doseLog: buildDoseLog(medicines),
          hasGeneratedSchedule: true,
          clockOffsetMinutes: 0,
        }))
      },

      markDose(doseId, status) {
        setState((s) => ({
          ...s,
          doseLog: s.doseLog.map((d) => (d.id === doseId ? { ...d, status, snoozeUntil: null } : d)),
        }))
      },

      /** Pushes a specific dose's "overdue" threshold forward by `minutes`,
       * without changing its status — used by the caregiver Snooze action. */
      snoozeDose(doseId, minutes = 30) {
        setState((s) => ({
          ...s,
          doseLog: s.doseLog.map((d) =>
            d.id === doseId
              ? { ...d, snoozeUntil: (s.clockOffsetMinutes + realNowMinutes()) + minutes }
              : d
          ),
        }))
      },

      /** Demo control: fast-forwards the simulated clock by one hour, so
       * upcoming doses can be watched turning into caregiver alerts. */
      advanceOneHour() {
        setState((s) => ({ ...s, clockOffsetMinutes: s.clockOffsetMinutes + 60 }))
      },

      resetClock() {
        setState((s) => ({ ...s, clockOffsetMinutes: 0 }))
      },

      updateProfile(patch) {
        setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
      },

      reset() {
        setState({
          medicines: [],
          doseLog: [],
          hasGeneratedSchedule: false,
          clockOffsetMinutes: 0,
          profile: DEFAULT_PROFILE,
        })
      },
    }
  }, [state])

  const adherenceToday = useMemo(() => {
    const decided = state.doseLog.filter((d) => d.status === 'taken' || d.status === 'missed')
    if (decided.length === 0) return 100
    const taken = decided.filter((d) => d.status === 'taken').length
    return Math.round((taken / decided.length) * 100)
  }, [state.doseLog])

  const adherenceHistory = useMemo(
    () => [...PAST_ADHERENCE, { day: 'Today', pct: adherenceToday }],
    [adherenceToday]
  )

  /** Doses that are still "upcoming" but whose scheduled (or snoozed-to)
   * time has passed the simulated clock — these drive caregiver alerts. */
  const overdueDoses = useMemo(() => {
    return state.doseLog
      .filter((d) => d.status === 'upcoming')
      .filter((d) => effectiveNowMinutes > (d.snoozeUntil ?? timeToMinutes(d.time)))
      .map((d) => ({
        ...d,
        minutesLate: effectiveNowMinutes - timeToMinutes(d.time),
      }))
      .sort((a, b) => b.minutesLate - a.minutesLate)
  }, [state.doseLog, effectiveNowMinutes])

  const value = {
    ...api,
    adherenceToday,
    adherenceHistory,
    effectiveNowMinutes,
    overdueDoses,
  }

  return <MedicationContext.Provider value={value}>{children}</MedicationContext.Provider>
}

export function useMedication() {
  const ctx = useContext(MedicationContext)
  if (!ctx) throw new Error('useMedication must be used within a MedicationProvider')
  return ctx
}
