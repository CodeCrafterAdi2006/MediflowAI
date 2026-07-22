import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SAMPLE_EXTRACTION } from '../data/mockData.js'

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

/** Builds today's dose log from a medicine list. Doses whose scheduled
 * time has already passed are seeded as mostly "taken" (with an
 * occasional "missed", for a realistic-looking demo); doses still ahead
 * are "upcoming". */
function buildDoseLog(medicines) {
  const now = realNowMinutes()
  const log = []
  medicines.forEach((med) => {
    med.times.forEach((time, i) => {
      const isPast = timeToMinutes(time) < now
      let status = 'upcoming'
      if (isPast) {
        // Deterministic-ish "mostly taken" pattern rather than pure random,
        // so the demo data doesn't reshuffle awkwardly on every edit.
        status = (med.id.charCodeAt(1) + i) % 5 === 0 ? 'missed' : 'taken'
      }
      log.push({
        id: `${med.id}-${time}`,
        medId: med.id,
        name: med.name,
        dosage: med.dosage,
        foodTiming: med.foodTiming,
        time,
        status,
        snoozeUntil: null, // minutes-of-day the dose is snoozed until, if any
      })
    })
  })
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
        setState((s) => ({ ...s, medicines }))
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
