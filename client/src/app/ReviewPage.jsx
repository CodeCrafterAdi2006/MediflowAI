import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ArrowRight, Pencil, AlertTriangle, MessageSquareText } from 'lucide-react'
import { useMedication, isSleepWarning } from '../context/MedicationContext.jsx'
import { confirmPrescription } from '../lib/api.js'
import { FOOD_TIMING_OPTIONS, FREQUENCY_OPTIONS } from '../data/mockData.js'
import Spinner from './components/Spinner.jsx'
import './ReviewPage.css'

let tempIdCounter = 0
function newId() {
  tempIdCounter += 1
  return `new-${Date.now()}-${tempIdCounter}`
}

function blankMedicine() {
  return {
    id: newId(),
    name: '',
    dosage: '',
    frequency: '1x daily',
    foodTiming: 'after',
    times: ['08:00'],
  }
}

function formatTime12(time) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

const FOOD_PHRASE = {
  before: 'before eating',
  after: 'after eating',
  bedtime: 'at bedtime',
  anytime: 'any time of day',
}

/** A short, plain-language line meant to be readable at a glance by an
 * older adult or a caregiver — not clinical shorthand. */
function plainLanguageSummary(row) {
  if (!row.name.trim()) return null
  const timesStr = row.times.map(formatTime12).join(', ')
  const foodPhrase = FOOD_PHRASE[row.foodTiming] || 'any time of day'
  return `Take ${row.dosage || 'your dose'} of ${row.name}, ${foodPhrase}, at ${timesStr}.`
}

export default function ReviewPage() {
  const { medicines, seedIfEmpty, generateSchedule } = useMedication()
  const [rows, setRows] = useState([])
  const [syncing, setSyncing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    seedIfEmpty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (medicines.length) setRows(medicines.map((m) => ({ ...m, times: [...m.times] })))
  }, [medicines])

  function updateRow(id, patch) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function updateTime(id, index, value) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r
        const times = [...r.times]
        times[index] = value
        return { ...r, times }
      })
    )
  }

  function addTime(id) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, times: [...r.times, '08:00'] } : r)))
  }

  function removeTime(id, index) {
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, times: r.times.filter((_, i) => i !== index) } : r))
    )
  }

  function removeMedicine(id) {
    setRows((rs) => rs.filter((r) => r.id !== id))
  }

  function addMedicine() {
    setRows((rs) => [...rs, blankMedicine()])
  }

  async function confirmAndSync() {
    const cleaned = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ ...r, times: r.times.length ? r.times : ['08:00'] }))

    setSyncing(true)

    // Real integration point for a backend: this prototype has none, so the
    // request is expected to fail — we log it and continue locally either way,
    // with a short minimum delay so the spinner is visible.
    const [syncResult] = await Promise.allSettled([
      confirmPrescription(cleaned),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ])

    if (syncResult.status === 'rejected') {
      console.error('Prescription sync failed:', syncResult.reason);
      alert(`Server error during sync: ${syncResult.reason?.message || 'Please try again.'}`);
    } else if (syncResult.value?.calendarSyncWarning) {
      alert(`Schedule confirmed, but Calendar Sync failed: ${syncResult.value.calendarSyncWarning}`);
    }

    generateSchedule(cleaned)
    setSyncing(false)
    navigate('/app/dashboard')
  }

  return (
    <div className="review-page">
      <div className="review-page__head">
        <span className="eyebrow">Step 2 of 4</span>
        <h1>Review extracted medicines</h1>
        <p>
          Here's what the AI read from the prescription. Fix anything that looks off before
          confirming the schedule.
        </p>
      </div>

      <div className="review-page__list">
        {rows.map((row) => {
          const summary = plainLanguageSummary(row)
          const hasSleepWarning = row.times.some(isSleepWarning)

          return (
            <div className="review-card" key={row.id}>
              <div className="review-card__top">
                <div className="review-card__field review-card__field--name">
                  <label>Medicine name</label>
                  <div className="review-card__input-icon">
                    <Pencil size={14} />
                    <input
                      value={row.name}
                      placeholder="e.g. Amoxicillin"
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="review-card__field">
                  <label>Dosage</label>
                  <input
                    value={row.dosage}
                    placeholder="e.g. 500mg"
                    onChange={(e) => updateRow(row.id, { dosage: e.target.value })}
                  />
                </div>
                <button
                  className="review-card__remove"
                  onClick={() => removeMedicine(row.id)}
                  aria-label={`Remove ${row.name || 'medicine'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="review-card__row">
                <div className="review-card__field">
                  <label>Frequency</label>
                  <select
                    value={row.frequency}
                    onChange={(e) => updateRow(row.id, { frequency: e.target.value })}
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="review-card__field">
                  <label>Food timing</label>
                  <select
                    value={row.foodTiming}
                    onChange={(e) => updateRow(row.id, { foodTiming: e.target.value })}
                  >
                    {FOOD_TIMING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="review-card__times">
                <label>Reminder times</label>
                <div className="review-card__time-chips">
                  {row.times.map((t, i) => (
                    <div className="review-card__time-chip" key={i}>
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => updateTime(row.id, i, e.target.value)}
                      />
                      {row.times.length > 1 && (
                        <button onClick={() => removeTime(row.id, i)} aria-label="Remove time">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="review-card__add-time" onClick={() => addTime(row.id)}>
                    <Plus size={13} /> Add time
                  </button>
                </div>
              </div>

              {summary && (
                <div className="review-card__summary">
                  <MessageSquareText size={15} />
                  <p><strong>In plain terms:</strong> {summary}</p>
                </div>
              )}

              {(row.isHighRisk || row.safetyWarning) && (
                <div className="review-card__warning review-card__warning--high-alert" style={{ background: 'rgba(239, 68, 68, 0.12)', borderLeft: '3px solid #ef4444', color: '#f87171', padding: '10px 14px', borderRadius: '6px', marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4' }}>
                    <strong>High-Alert Medication Caution:</strong> {row.safetyWarning || 'Narrow therapeutic index drug. Take exact dosage as prescribed by doctor.'}
                  </p>
                </div>
              )}

              {hasSleepWarning && (
                <div className="review-card__warning">
                  <AlertTriangle size={15} />
                  <p>
                    This dose falls late at night. Double-check it won't disturb sleep, and
                    consider a caregiver reminder for this one.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button className="review-page__add-medicine" onClick={addMedicine}>
        <Plus size={16} /> Add another medicine
      </button>

      <div className="review-page__actions">
        {syncing && <Spinner label="Syncing with your care team..." />}
        <button
          className="btn btn-primary"
          onClick={confirmAndSync}
          disabled={!rows.some((r) => r.name.trim()) || syncing}
        >
          Confirm & Sync <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
