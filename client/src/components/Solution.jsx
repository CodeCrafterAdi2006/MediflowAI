import { ScanText, CalendarClock, BellRing, LineChart, Users } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import './Solution.css'

const ITEMS = [
  {
    icon: ScanText,
    title: 'AI reads the prescription',
    text: 'Snap a photo of any handwritten prescription — our model extracts medicine names, dosages, and frequency.',
    tone: 'blue',
  },
  {
    icon: CalendarClock,
    title: 'Creates a medication schedule',
    text: 'Extracted details become a clear, timed daily schedule — no manual entry required.',
    tone: 'green',
  },
  {
    icon: BellRing,
    title: 'Sends smart reminders',
    text: 'Gentle nudges at exactly the right moment, including before-food and after-food timing.',
    tone: 'blue',
  },
  {
    icon: LineChart,
    title: 'Tracks adherence',
    text: 'Every dose taken or missed is logged automatically, building a clear history over time.',
    tone: 'green',
  },
]

export default function Solution() {
  const ref = useReveal()

  return (
    <section id="solution" className="solution section" ref={ref}>
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">The solution</span>
          <h2>From handwriting to habit, in four steps</h2>
          <p>MediFlow AI turns a photo into a routine your whole care circle can see.</p>
        </div>

        <div className="solution__bento">
          {ITEMS.map(({ icon: Icon, title, text, tone }, i) => (
            <div
              className={`solution__tile solution__tile--${tone} reveal`}
              key={title}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="solution__icon">
                <Icon size={20} strokeWidth={2} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}

          <div className="solution__tile solution__tile--feature reveal" style={{ transitionDelay: '320ms' }}>
            <div className="solution__icon solution__icon--feature">
              <Users size={22} strokeWidth={2} />
            </div>
            <h3>A dashboard for caregivers, too</h3>
            <p>
              Family members and caregivers see adherence in real time — what was
              taken, what was missed, and when to step in — without hovering over
              the patient.
            </p>
            <div className="solution__feature-visual">
              <div className="feature-visual__row">
                <span className="feature-visual__label">Morning dose</span>
                <span className="feature-visual__status feature-visual__status--ok">Taken · 8:02 AM</span>
              </div>
              <div className="feature-visual__row">
                <span className="feature-visual__label">Afternoon dose</span>
                <span className="feature-visual__status feature-visual__status--warn">Missed · 1:30 PM</span>
              </div>
              <div className="feature-visual__row">
                <span className="feature-visual__label">Evening dose</span>
                <span className="feature-visual__status feature-visual__status--pending">Upcoming · 9:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
