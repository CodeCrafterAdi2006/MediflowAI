import {
  ScanLine,
  BrainCircuit,
  BellRing,
  UtensilsCrossed,
  Users,
  History,
} from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import './Features.css'

const FEATURES = [
  {
    icon: ScanLine,
    title: 'OCR prescription scan',
    text: 'Reads handwritten and printed prescriptions directly from a photo.',
  },
  {
    icon: BrainCircuit,
    title: 'AI medicine parser',
    text: 'Understands medicine names, strengths, and dosage instructions, even shorthand.',
  },
  {
    icon: BellRing,
    title: 'Smart reminders',
    text: 'Reminders timed to each medicine\'s schedule, not just a generic alarm.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Before/after food alerts',
    text: 'Flags whether a dose should be taken before or after eating.',
  },
  {
    icon: Users,
    title: 'Caregiver monitoring',
    text: 'Family members can follow adherence from their own device, in real time.',
  },
  {
    icon: History,
    title: 'Medication history',
    text: 'A complete, searchable log of every dose — useful for the next doctor visit.',
  },
]

export default function Features() {
  const ref = useReveal()

  return (
    <section id="features" className="features section" ref={ref}>
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Features</span>
          <h2>Everything needed to stay on schedule</h2>
          <p>Built around the details that actually cause missed doses.</p>
        </div>

        <div className="features__grid">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <div className="features__card reveal" key={title} style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
              <div className="features__icon">
                <Icon size={20} strokeWidth={2} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
