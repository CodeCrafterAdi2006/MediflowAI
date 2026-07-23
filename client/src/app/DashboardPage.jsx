import { Link } from 'react-router-dom'
import { Inbox, FastForward, RotateCcw } from 'lucide-react'
import { useMedication, timeToMinutes } from '../context/MedicationContext.jsx'
import DoseCard from './DoseCard.jsx'
import './DashboardPage.css'

export default function DashboardPage() {
  const {
    doseLog,
    adherenceToday,
    adherenceHistory,
    markDose,
    hasGeneratedSchedule,
    effectiveNowMinutes,
    clockOffsetMinutes,
    advanceOneHour,
    resetClock,
  } = useMedication()

  if (!hasGeneratedSchedule || doseLog.length === 0) {
    return (
      <div className="dash-empty">
        <div className="dash-empty__icon"><Inbox size={26} /></div>
        <h2>No schedule yet</h2>
        <p>Upload a prescription and confirm the extracted medicines to see today's plan here.</p>
        <Link to="/app/upload" className="btn btn-primary">Upload a prescription</Link>
      </div>
    )
  }

  const taken = doseLog.filter((d) => d.status === 'taken').length
  const missed = doseLog.filter((d) => d.status === 'missed').length
  const upcoming = doseLog.filter((d) => d.status === 'upcoming').length

  function isOverdue(dose) {
    return dose.status === 'upcoming' && effectiveNowMinutes > (dose.snoozeUntil ?? timeToMinutes(dose.time))
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__head">
        <span className="eyebrow">Step 3 of 4</span>
        <h1>Today's schedule</h1>
        <p>Everything extracted from your prescription, organized by time.</p>
      </div>

      <div className="dashboard-page__stats">
        <div className="stat-card">
          <p className="stat-card__label">Doses today</p>
          <p className="stat-card__value">{doseLog.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Taken</p>
          <p className="stat-card__value stat-card__value--green">{taken}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Missed</p>
          <p className="stat-card__value stat-card__value--red">{missed}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Upcoming</p>
          <p className="stat-card__value stat-card__value--blue">{upcoming}</p>
        </div>
      </div>

      <div className="dashboard-page__grid">
        <div className="dashboard-panel">
          <h2 className="dashboard-panel__title">Doses</h2>
          <div className="dose-list">
            {doseLog.map((dose) => (
              <DoseCard
                key={dose.id}
                dose={dose}
                isOverdue={isOverdue(dose)}
                onTaken={() => markDose(dose.id, 'taken')}
                onSkip={() => markDose(dose.id, 'missed')}
              />
            ))}
          </div>
        </div>

        <div className="dashboard-panel">
          <h2 className="dashboard-panel__title">Weekly adherence</h2>
          <div className="week-chart">
            {adherenceHistory.map((d) => (
              <div className="week-chart__col" key={d.day}>
                <div className="week-chart__track">
                  <div
                    className={`week-chart__bar ${d.day === 'Today' ? 'week-chart__bar--today' : ''}`}
                    style={{ height: `${d.pct}%` }}
                  />
                </div>
                <span className="week-chart__pct">{d.pct}%</span>
                <span className="week-chart__label">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="week-chart__summary">
            <span className="week-chart__summary-value">{adherenceToday}%</span>
            <span>adherence today</span>
          </div>
          <Link to="/app/caregiver" className="dashboard-panel__link">
            View caregiver dashboard →
          </Link>
        </div>
      </div>

      <div className="demo-bar">
        <div className="demo-bar__label">
          <FastForward size={16} />
          <span>
            Demo controls
            {clockOffsetMinutes > 0 && (
              <span className="demo-bar__offset"> · clock is +{clockOffsetMinutes / 60}h ahead</span>
            )}
          </span>
        </div>
        <div className="demo-bar__actions">
          {clockOffsetMinutes > 0 && (
            <button className="demo-bar__reset" onClick={resetClock}>
              <RotateCcw size={14} /> Reset clock
            </button>
          )}
          <button className="demo-bar__btn" onClick={advanceOneHour}>
            ⏩ Simulate 1 Hour Later
          </button>
        </div>
      </div>
    </div>
  )
}
