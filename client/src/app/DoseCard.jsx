import { Check, X, UtensilsCrossed, Moon, Clock3, AlertTriangle } from 'lucide-react'
import StatusPill from './components/StatusPill.jsx'
import './DoseCard.css'

const FOOD_ICON = {
  before: UtensilsCrossed,
  after: UtensilsCrossed,
  bedtime: Moon,
  anytime: Clock3,
}

const FOOD_LABEL = {
  before: 'Before food',
  after: 'After food',
  bedtime: 'Bedtime',
  anytime: 'Anytime',
}

export default function DoseCard({ dose, isOverdue, onTaken, onSkip }) {
  const FoodIcon = FOOD_ICON[dose.foodTiming] ?? Clock3

  return (
    <div className={`dose-card dose-card--${dose.status} ${isOverdue ? 'dose-card--overdue' : ''}`}>
      <div className="dose-card__main">
        <span className="dose-card__time">{dose.time}</span>
        <div className="dose-card__info">
          <strong>{dose.name}</strong>
          <span className="dose-card__sub">
            <FoodIcon size={12} /> {dose.dosage} · {FOOD_LABEL[dose.foodTiming] ?? 'Anytime'}
          </span>
        </div>
        <StatusPill status={dose.status} />
      </div>

      {isOverdue && (
        <div className="dose-card__overdue-flag">
          <AlertTriangle size={13} /> Overdue — a caregiver alert has been raised
        </div>
      )}

      {dose.status === 'upcoming' && (
        <div className="dose-card__actions">
          <button className="dose-card__btn dose-card__btn--taken" onClick={onTaken}>
            <Check size={20} strokeWidth={2.6} /> TAKEN
          </button>
          <button className="dose-card__btn dose-card__btn--skip" onClick={onSkip}>
            <X size={20} strokeWidth={2.6} /> SKIP
          </button>
        </div>
      )}
    </div>
  )
}
