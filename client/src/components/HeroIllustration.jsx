import { Check, ScanLine, Bell } from 'lucide-react'
import './HeroIllustration.css'

/**
 * Signature visual: a handwritten prescription being scanned on the left,
 * resolving into a clean, timed medicine schedule on the right — the
 * whole product pitch in one animated glance.
 */
export default function HeroIllustration() {
  return (
    <div className="hero-illo" aria-hidden="true">
      <div className="hero-illo__card hero-illo__card--rx">
        <div className="rx-card__header">Rx</div>
        <div className="rx-scribble rx-scribble--1" />
        <div className="rx-scribble rx-scribble--2" />
        <div className="rx-scribble rx-scribble--3 rx-scribble--short" />
        <div className="rx-scribble rx-scribble--4" />
        <div className="rx-card__scanline">
          <ScanLine size={16} />
        </div>
      </div>

      <div className="hero-illo__arrow">
        <svg width="52" height="24" viewBox="0 0 52 24" fill="none">
          <path d="M0 12H46" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 5" />
          <path d="M40 5L47 12L40 19" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="hero-illo__card hero-illo__card--schedule">
        <div className="schedule-card__title">Today's schedule</div>

        <div className="schedule-row schedule-row--done">
          <span className="schedule-dot schedule-dot--done"><Check size={12} strokeWidth={3} /></span>
          <div className="schedule-row__text">
            <strong>Amoxicillin</strong>
            <span>500mg · after food</span>
          </div>
          <span className="schedule-time">8:00 AM</span>
        </div>

        <div className="schedule-row schedule-row--active">
          <span className="schedule-dot schedule-dot--active" />
          <div className="schedule-row__text">
            <strong>Metformin</strong>
            <span>250mg · before food</span>
          </div>
          <span className="schedule-time">1:30 PM</span>
        </div>

        <div className="schedule-row">
          <span className="schedule-dot" />
          <div className="schedule-row__text">
            <strong>Atorvastatin</strong>
            <span>10mg · bedtime</span>
          </div>
          <span className="schedule-time">9:00 PM</span>
        </div>
      </div>

      <div className="hero-illo__chip hero-illo__chip--reminder">
        <Bell size={14} />
        Reminder sent
      </div>

      <div className="hero-illo__chip hero-illo__chip--adherence">
        94% adherence this week
      </div>
    </div>
  )
}
