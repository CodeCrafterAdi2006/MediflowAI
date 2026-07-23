import { AlertTriangle, Check, Clock } from 'lucide-react'
import './AlertCard.css'

function formatMinutesLate(minutes) {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours} hour${hours === 1 ? '' : 's'} ago`
}

export default function AlertCard({ dose, onMarkTaken, onSnooze }) {
  return (
    <div className="alert-card">
      <div className="alert-card__icon">
        <AlertTriangle size={18} />
      </div>
      <div className="alert-card__body">
        <p className="alert-card__title">
          {dose.name} missed <span>{formatMinutesLate(dose.minutesLate)}</span>
        </p>
        <p className="alert-card__meta">{dose.dosage} · scheduled for {dose.time}</p>
      </div>
      <div className="alert-card__actions">
        <button className="alert-card__btn alert-card__btn--taken" onClick={onMarkTaken}>
          <Check size={14} /> Mark Taken
        </button>
        <button className="alert-card__btn alert-card__btn--snooze" onClick={onSnooze}>
          <Clock size={14} /> Snooze 30 min
        </button>
      </div>
    </div>
  )
}
