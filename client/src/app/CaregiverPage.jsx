import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Inbox, Clock, ShieldCheck, Send, MessageSquare } from 'lucide-react'
import { useMedication } from '../context/MedicationContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { API_BASE } from '../lib/api.js'
import { OTHER_PATIENTS } from '../data/mockData.js'
import ProgressBar from './components/ProgressBar.jsx'
import StatusPill from './components/StatusPill.jsx'
import AlertCard from './AlertCard.jsx'
import './CaregiverPage.css'

export default function CaregiverPage() {
  const { overdueDoses, markDose, snoozeDose } = useMedication()
  const { user } = useAuth()
  const [telegramCode, setTelegramCode] = useState(null)
  const [loadingCode, setLoadingCode] = useState(false)

  const generateTelegramCode = async () => {
    setLoadingCode(true)
    try {
      const res = await fetch(`${API_BASE}/api/telegram/link-code`, { credentials: 'include' })
      const data = await res.json()
      if (data.code) {
        setTelegramCode(data.code)
      } else {
        alert(data.error || 'Please sign in to link Telegram caregiver alerts.')
      }
    } catch (err) {
      alert('Failed to generate Telegram link code. Make sure you are signed in.')
    } finally {
      setLoadingCode(false)
    }
  }

  const patients = OTHER_PATIENTS
  const dependentActivity = [
    { id: 'da1', time: '9:00 PM', name: 'Atorvastatin (10mg)', patient: 'Arjun Mehta (Father)', status: 'missed' },
    { id: 'da2', time: '1:30 PM', name: 'Metformin (500mg)', patient: 'Radhika Shah (Mother)', status: 'taken' },
    { id: 'da3', time: '8:00 AM', name: 'Metformin (500mg)', patient: 'Radhika Shah (Mother)', status: 'taken' },
  ]

  return (
    <div className="caregiver-page">
      <div className="caregiver-page__head">
        <span className="eyebrow">Step 4 of 4</span>
        <h1>Caregiver dashboard</h1>
        <p>Monitor adherence and alerts for all dependents in your care circle.</p>
      </div>

      {/* Telegram Caregiver Alert Integration Card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <MessageSquare size={18} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>Real-Time Telegram Caregiver Alerts</h3>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Get instant push notifications on Telegram whenever a dependent misses a medication dose.
          </p>
        </div>

        {telegramCode ? (
          <div style={{ background: 'var(--surface-sunken)', padding: '10px 16px', borderRadius: '8px', border: '1px solid #38bdf8', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>SEND CODE TO TELEGRAM BOT</span>
            <strong style={{ fontSize: '20px', letterSpacing: '3px', color: '#38bdf8' }}>{telegramCode}</strong>
          </div>
        ) : (
          <button
            onClick={generateTelegramCode}
            disabled={loadingCode}
            style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Send size={16} />
            {loadingCode ? 'Generating...' : 'Link Telegram Bot'}
          </button>
        )}
      </div>

      {overdueDoses.length > 0 ? (
        <div className="alert-banner">
          <AlertTriangle size={20} />
          <p>
            <strong>{overdueDoses.length} Active Alert{overdueDoses.length > 1 ? 's' : ''}:</strong>{' '}
            {overdueDoses[0].name} missed{' '}
            {overdueDoses[0].minutesLate < 60
              ? `${overdueDoses[0].minutesLate} minutes ago`
              : `${Math.round((overdueDoses[0].minutesLate / 60) * 10) / 10} hours ago`}
            {overdueDoses.length > 1 ? ` (+${overdueDoses.length - 1} more)` : ''}
          </p>
        </div>
      ) : (
        <div className="alert-banner alert-banner--clear">
          <ShieldCheck size={20} />
          <p><strong>No active alerts</strong> — all dependents are on schedule right now.</p>
        </div>
      )}

      {overdueDoses.length > 0 && (
        <div className="caregiver-page__alerts">
          {overdueDoses.map((dose) => (
            <AlertCard
              key={dose.id}
              dose={dose}
              onMarkTaken={() => markDose(dose.id, 'taken')}
              onSnooze={() => snoozeDose(dose.id, 30)}
            />
          ))}
        </div>
      )}

      <div className="caregiver-page__patients">
        {patients.map((p) => (
          <div className="patient-card" key={p.id}>
            <div className="patient-card__top">
              <div className="patient-card__avatar">{p.name.charAt(0)}</div>
              <div>
                <p className="patient-card__name">{p.name}</p>
                <p className="patient-card__relation">{p.relation}</p>
              </div>
              <span className={`patient-card__badge patient-card__badge--${p.status}`}>
                {p.status === 'on-track' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                {p.status === 'on-track' ? 'On track' : 'Needs attention'}
              </span>
            </div>

            <div className="patient-card__adherence">
              <div className="patient-card__adherence-row">
                <span>Adherence</span>
                <strong>{p.adherence}%</strong>
              </div>
              <ProgressBar value={p.adherence} tone={p.adherence >= 80 ? 'green' : 'amber'} />
            </div>

            <p className="patient-card__activity">
              {p.lastActivity}
            </p>
          </div>
        ))}
      </div>

      <div className="caregiver-page__panel">
        <h2>Recent activity — dependents</h2>

        <div className="activity-list">
          {dependentActivity.map((dose) => (
            <div className="activity-row" key={dose.id}>
              <span className="activity-row__time"><Clock size={12} /> {dose.time}</span>
              <div className="activity-row__info">
                <strong>{dose.name}</strong>
                <span>{dose.patient}</span>
              </div>
              <StatusPill status={dose.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
